import { prefersReducedMotion } from "./reduced-motion";

/**
 * Monta el retrato de vóxeles del hero cuando el entorno lo admite.
 *
 * La imagen fija (`hero-portrait.webp`, la misma malla dibujada plana) va en el
 * HTML y es lo que se ve sin JS, sin WebGL, con movimiento reducido o en una
 * pantalla estrecha. La escena se carga después, con Three en un chunk aparte,
 * y sólo entonces se esconde la imagen: nunca hay un hueco vacío.
 */

interface Mounted {
    destroy: () => void;
}

let mounted: Mounted | null = null;
let generation = 0;

export async function initHeroPortrait(): Promise<void> {
    destroyHeroPortrait();
    const mine = generation;

    const container = document.querySelector<HTMLElement>("[data-hero-portrait]");
    const src = container?.dataset.voxels;
    if (!container || !src) return;
    if (prefersReducedMotion()) return;
    // En móvil se queda la imagen: el giro hacia el cursor no existe sin cursor
    // y cinco mil cubos no compensan la batería.
    if (!window.matchMedia("(min-width: 48rem) and (any-pointer: fine)").matches) return;

    const { supportsWebGL } = await import("./three/renderer");
    if (mine !== generation || !supportsWebGL()) return;

    const { createPortraitScene } = await import("./three/portrait-scene");
    if (mine !== generation) return;

    try {
        const scene = await createPortraitScene(container, src);
        if (mine !== generation) {
            scene.destroy();
            return;
        }
        mounted = scene;
        container.setAttribute("data-live", "");
    } catch {
        // Si la escena no monta, la imagen fija ya está puesta: no hay nada que
        // arreglar a la vista.
    }
}

export function destroyHeroPortrait(): void {
    generation += 1;
    mounted?.destroy();
    mounted = null;
    document.querySelector("[data-hero-portrait]")?.removeAttribute("data-live");
}
