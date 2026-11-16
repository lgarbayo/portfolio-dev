import { THREE, createScene, startRendering, stopRendering } from "./renderer";

/**
 * El retrato del hero hecho de cubos.
 *
 * Cada píxel de `portrait-voxels.png` es un cubo (ver
 * `scripts/portrait/make_portrait.py`): R es su gris, G cuánto sobresale y B si
 * existe. Es un `InstancedMesh`, así que los ~5.000 cubos son una sola llamada
 * de dibujo.
 *
 * Tres movimientos, los tres baratos:
 *  - al montar, los cubos llegan desde atrás y se colocan, columna a columna;
 *  - la malla gira un poco hacia el cursor, como si te mirase;
 *  - donde pasa el ratón, los cubos se hunden y vuelven, como una tecla.
 */

export interface PortraitScene {
    destroy: () => void;
}

interface Voxel {
    x: number;
    y: number;
    depth: number;
    /** Retraso de llegada, en segundos. */
    delay: number;
    /** Hundimiento actual por el cursor, de 0 a 1. */
    press: number;
}

const CELL = 1;
const GAP = 0.12;
const DEPTH = 9;
const INTRO = 1.6;
const TILT = 0.22;

export async function createPortraitScene(container: HTMLElement, src: string): Promise<PortraitScene> {
    const pixels = await readPixels(src);
    const { width: cols, height: rows, data } = pixels;

    const voxels: Voxel[] = [];
    const colors: number[] = [];
    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            const i = (y * cols + x) * 4;
            if (data[i + 2]! < 128) continue;
            const lum = data[i]! / 255;
            voxels.push({
                x: (x - cols / 2) * CELL,
                y: (rows / 2 - y) * CELL,
                depth: (data[i + 1]! / 255) * DEPTH,
                // De abajo arriba y con algo de ruido: se lee como algo que se
                // construye, no como una cortina que baja.
                delay: ((rows - y) / rows) * 0.7 + Math.random() * 0.35,
                press: 0,
            });
            // Curva algo más dura que la foto: la luz de la escena ya aclara las
            // caras de los cubos, y sin ella la camiseta negra sale gris.
            const shade = 0.02 + Math.pow(lum, 1.35) * 0.98;
            colors.push(shade, shade, shade);
        }
    }

    const { scene, camera, renderer, destroy: destroyBase } = createScene({
        container,
        fov: 28,
        cameraPosition: [0, 0, 240],
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // La cámara compartida corta a 100 unidades; el retrato vive a 240.
    camera.far = 1000;
    camera.updateProjectionMatrix();

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-60, 80, 120);
    scene.add(key);

    const size = CELL - GAP;
    const geometry = new THREE.BoxGeometry(size, size, size * 2.2);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geometry, material, voxels.length);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(colors), 3);
    mesh.frustumCulled = false;

    const board = new THREE.Group();
    board.add(mesh);
    scene.add(board);

    // Encaje: el retrato ocupa el alto del contenedor y se apoya en el borde
    // de abajo, como un busto en la pantalla.
    const fit = () => {
        const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const scale = (visibleHeight * 0.92) / (rows * CELL);
        board.scale.setScalar(scale);
        board.position.y = -(visibleHeight - rows * CELL * scale) / 2;
    };
    fit();
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(container);

    // --- Cursor ---
    const pointer = new THREE.Vector2(0, 0);
    const target = new THREE.Vector2(0, 0);
    let pointerInside = false;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    const local = new THREE.Vector3();

    const onPointerMove = (event: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        pointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        // La inclinación sigue al cursor en toda la ventana, no sólo encima.
        target.set(
            (event.clientX / window.innerWidth) * 2 - 1,
            -((event.clientY / window.innerHeight) * 2 - 1),
        );
        pointerInside =
            event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // --- Animación ---
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scaleVec = new THREE.Vector3(1, 1, 1);
    let elapsed = 0;

    const update = (delta: number) => {
        elapsed += delta;

        board.rotation.y += (target.x * TILT - board.rotation.y) * Math.min(1, delta * 3);
        board.rotation.x += (-target.y * TILT * 0.6 - board.rotation.x) * Math.min(1, delta * 3);

        let cursorX = Infinity;
        let cursorY = Infinity;
        if (pointerInside) {
            raycaster.setFromCamera(pointer, camera);
            plane.constant = 0;
            if (raycaster.ray.intersectPlane(plane, hit)) {
                local.copy(hit);
                board.worldToLocal(local);
                cursorX = local.x;
                cursorY = local.y;
            }
        }

        for (let i = 0; i < voxels.length; i += 1) {
            const voxel = voxels[i]!;
            const t = Math.min(1, Math.max(0, (elapsed - voxel.delay) / (INTRO - 0.7)));
            const arrive = 1 - Math.pow(1 - t, 3);

            const dx = voxel.x - cursorX;
            const dy = voxel.y - cursorY;
            const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 7);
            voxel.press += (near - voxel.press) * Math.min(1, delta * 10);

            position.set(
                voxel.x,
                voxel.y,
                voxel.depth - voxel.press * 4 - (1 - arrive) * 120,
            );
            scaleVec.setScalar(0.2 + arrive * 0.8);
            matrix.compose(position, quaternion, scaleVec);
            mesh.setMatrixAt(i, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    };

    const handle = { scene, camera, renderer, update, destroy: () => {} };

    // Sólo se pinta mientras se ve: con el hero fuera de pantalla no hay nada
    // que mover.
    const visibility = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) startRendering(handle);
        else stopRendering(handle);
    });
    visibility.observe(container);

    return {
        destroy() {
            visibility.disconnect();
            resizeObserver.disconnect();
            stopRendering(handle);
            window.removeEventListener("pointermove", onPointerMove);
            mesh.dispose();
            destroyBase();
        },
    };
}

/** Lee los píxeles de la imagen de datos sin pasar por el color de la página. */
async function readPixels(src: string): Promise<ImageData> {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" })!;
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
