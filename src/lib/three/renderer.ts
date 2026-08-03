import * as THREE from "three";

/**
 * Runtime 3D compartido entre el avatar y la escena del teclado.
 *
 * Existe por dos razones. La primera es el peso: importando Three desde un único
 * módulo, Vite lo emite en un chunk y las dos islas se lo reparten en vez de
 * duplicarlo. La segunda es que dos renderers descoordinados en la misma página
 * compiten por la GPU y por el bucle de animación; aquí hay un solo `rAF` que
 * tira de todas las escenas registradas.
 *
 * Nada de esto se carga hasta que alguien lo pide con `await import()`.
 */

export interface SceneHandle {
    /** Se llama en cada frame con el delta en segundos. */
    update?: (delta: number) => void;
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    destroy: () => void;
}

/** ¿Puede este navegador pintar WebGL? Si no, cada isla usa su respaldo estático. */
export function supportsWebGL(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(
            window.WebGLRenderingContext &&
                (canvas.getContext("webgl2") || canvas.getContext("webgl")),
        );
    } catch {
        return false;
    }
}

interface CreateOptions {
    container: HTMLElement;
    /** Campo de visión; el teclado quiere poco, el avatar algo más. */
    fov?: number;
    cameraPosition?: [number, number, number];
    alpha?: boolean;
    /**
     * Tone mapping filmico. Lo pide quien ilumina con valores físicos —el
     * teclado tiene una direccional a 2.2 y un mapa de entorno— porque sin él
     * los blancos se van a plano y el plástico pierde el brillo. Se activa a
     * mano en vez de por defecto para no reencuadrar el avatar de paso.
     */
    filmic?: boolean;
}

export function createScene({
    container,
    fov = 35,
    cameraPosition = [0, 0, 5],
    alpha = true,
    filmic = false,
}: CreateOptions) {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    camera.position.set(...cameraPosition);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha });
    // Se limita a 2 porque por encima el coste sube mucho y la diferencia
    // visible es mínima.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearAlpha(0);

    if (filmic) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
    }

    container.appendChild(renderer.domElement);

    const resize = () => {
        const { clientWidth, clientHeight } = container;
        if (clientWidth === 0 || clientHeight === 0) return;
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight, false);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return {
        scene,
        camera,
        renderer,
        resize,
        destroy() {
            observer.disconnect();
            renderer.dispose();
            renderer.domElement.remove();
            // Liberar geometrías y materiales a mano: Three no lo hace al tirar
            // la escena, y una isla que se monta y desmonta varias veces acaba
            // filtrando memoria de GPU.
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    const materials = Array.isArray(object.material)
                        ? object.material
                        : [object.material];
                    materials.forEach((material) => material.dispose());
                }
            });
        },
    };
}

// --- Bucle compartido ---

const running = new Set<SceneHandle>();
let frame: number | undefined;
let lastTime = 0;

function tick(time: number) {
    const delta = lastTime === 0 ? 0 : (time - lastTime) / 1000;
    lastTime = time;

    for (const handle of running) {
        handle.update?.(delta);
        handle.renderer.render(handle.scene, handle.camera);
    }

    frame = running.size > 0 ? requestAnimationFrame(tick) : undefined;
}

export function startRendering(handle: SceneHandle): void {
    running.add(handle);
    if (frame === undefined) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
    }
}

export function stopRendering(handle: SceneHandle): void {
    running.delete(handle);
    if (running.size === 0 && frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
    }
}

export { THREE };
