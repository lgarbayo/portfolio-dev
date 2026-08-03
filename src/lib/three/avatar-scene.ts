import {
    THREE,
    createScene,
    startRendering,
    stopRendering,
    type SceneHandle,
} from "./renderer";

/**
 * Figura 3D del hero: un modelo glTF que se gira hacia el cursor.
 *
 * El modelo es una malla sola, sin huesos ni clips —viene de un escaneo
 * limpiado en Blender—, así que lo que gira es la figura entera, como una
 * peana. Con esqueleto se giraría sólo la cabeza; sin él, girar el conjunto es
 * lo único honesto: mover un trozo de una malla continua la rompería.
 *
 * Tampoco trae materiales, así que se le pone uno de barro claro. Si algún día
 * el GLB llega texturizado, esta escena respeta lo que traiga.
 */

/** Giro máximo hacia el cursor, en radianes. */
const MAX_YAW = 0.34;
const MAX_PITCH = 0.13;
/** Constante del amortiguado: cuanto más alta, más pegado va al cursor. */
const FOLLOW = 5;
/** Altura a la que se normaliza el modelo, sea cual sea su escala original. */
const TARGET_HEIGHT = 2;
/** Aire alrededor de la figura dentro de su caja. */
const FRAMING = 1.04;

const FOV = 30;

export interface AvatarHandle extends SceneHandle {
    /** Destino del giro, en el rango -1..1 (centro de la ventana = 0). */
    setPointer(x: number, y: number): void;
    /** Fuera de pantalla se para el bucle: no se pinta lo que nadie ve. */
    setActive(active: boolean): void;
}

export async function createAvatarScene(
    container: HTMLElement,
    modelUrl: string,
): Promise<AvatarHandle> {
    // Loader y descompresor van aparte del core de Three: sólo entran si de
    // verdad hay un modelo que cargar.
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/loaders/DRACOLoader.js"),
    ]);

    const { scene, camera, renderer, destroy: destroyBase } = createScene({
        container,
        fov: FOV,
        cameraPosition: [0, 0, 4],
    });

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1c1c1c, 1.5));

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(2.4, 3.2, 3);
    scene.add(key);

    // Contorno desde atrás: despega la figura del fondo, que es del mismo gris.
    const rim = new THREE.DirectionalLight(0xffffff, 1.4);
    rim.position.set(-2, 1.8, -2.6);
    scene.add(rim);

    const draco = new DRACOLoader();
    draco.setDecoderPath("/assets/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    let gltf: Awaited<ReturnType<typeof loader.loadAsync>>;
    try {
        gltf = await loader.loadAsync(modelUrl);
    } finally {
        // El decodificador ocupa un worker y un módulo wasm; una vez leído el
        // modelo no hace falta para nada.
        draco.dispose();
    }

    const model = gltf.scene;

    // Sin materiales en el fichero, Three pone el del estándar: metálico del
    // todo y negro. El barro claro es lo que encaja con la web en grises.
    const untextured = !(gltf.parser.json.materials?.length > 0);
    if (untextured) {
        const clay = new THREE.MeshStandardMaterial({
            color: 0xa2a2a2,
            roughness: 0.72,
            metalness: 0,
        });
        model.traverse((object: THREE.Object3D) => {
            if (object instanceof THREE.Mesh) object.material = clay;
        });
    }

    // Normalizado: el modelo queda centrado en el origen y con altura conocida,
    // así el encuadre no depende de en qué escala se exportara.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = TARGET_HEIGHT / size.y;
    model.scale.setScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);

    // El pivote es lo que gira: el modelo va dentro ya centrado, así que el eje
    // de giro pasa por el centro de la figura y no por donde cayera su origen.
    const pivot = new THREE.Group();
    pivot.add(model);
    scene.add(pivot);

    /*
     * Radio de la figura en planta.
     *
     * Es lo que hay que reservar por delante del centro, y por dos motivos que
     * se suman. Uno: en perspectiva, lo que está más cerca de la cámara se
     * proyecta más grande, y aquí las rodillas y los pies se adelantan medio
     * cuerpo respecto al eje de giro —encuadrar sólo por la altura los dejaba
     * fuera por abajo—. Dos: al girar hacia el cursor, ese fondo pasa a ser
     * ancho, así que el radio en el plano XZ vale para cualquier ángulo.
     */
    const radius = Math.hypot(size.x * scale, size.z * scale) / 2;

    let lastAspect = 0;
    const fit = () => {
        const aspect = camera.aspect;
        if (aspect === lastAspect) return;
        lastAspect = aspect;

        const vFov = (FOV * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
        // La distancia se mide hasta el centro, pero lo que tiene que caber es
        // el plano de delante: de ahí el radio sumado a cada término.
        const distanceForHeight = TARGET_HEIGHT / 2 / Math.tan(vFov / 2) + radius;
        const distanceForWidth = radius / Math.tan(hFov / 2) + radius;
        // Manda la dimensión que peor quepa: si la caja se estrecha, la figura
        // se aleja en vez de salirse por los lados.
        camera.position.z = Math.max(distanceForHeight, distanceForWidth) * FRAMING;
    };
    fit();

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const handle: AvatarHandle = {
        scene,
        camera,
        renderer,
        update(delta) {
            fit();
            // Paso por tiempo real: el giro tarda lo mismo a 60 Hz que a 144.
            const k = 1 - Math.exp(-FOLLOW * Math.min(delta, 0.1));
            current.x += (target.x - current.x) * k;
            current.y += (target.y - current.y) * k;
            pivot.rotation.y = current.x * MAX_YAW;
            pivot.rotation.x = current.y * MAX_PITCH;
        },
        setPointer(x, y) {
            target.x = clamp(x);
            target.y = clamp(y);
        },
        setActive(active) {
            if (active) startRendering(handle);
            else stopRendering(handle);
        },
        destroy() {
            stopRendering(handle);
            destroyBase();
        },
    };

    startRendering(handle);
    return handle;
}

function clamp(value: number): number {
    return Math.max(-1, Math.min(1, value));
}
