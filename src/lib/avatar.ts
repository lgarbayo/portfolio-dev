import { prefersReducedMotion } from "./reduced-motion";
import type { AvatarHandle } from "./three/avatar-scene";

/**
 * Figura del hero: imagen primero, modelo 3D después.
 *
 * El hueco nunca está vacío. El HTML ya trae un render de la misma figura, así
 * que la bienvenida está completa antes de que este módulo haga nada; si el 3D
 * llega, sustituye a la imagen, y si no llega —móvil, sin WebGL, el modelo no
 * carga— la imagen se queda y no se nota que faltaba nada.
 *
 * En móvil no se monta a propósito: son 108 KB de modelo más el motor, y el
 * giro hacia el cursor no existe sin cursor.
 */

let avatar: AvatarHandle | null = null;
let cleanup: (() => void) | null = null;

export async function initAvatar(): Promise<void> {
    destroyAvatar();

    const slot = document.querySelector<HTMLElement>("[data-avatar-slot]");
    if (!slot) return;

    const modelUrl = slot.dataset.model;
    // Sin modelo no hay nada que montar. La imagen ya está puesta.
    if (!modelUrl) return;

    const narrow = window.matchMedia("(max-width: 56rem)").matches;
    const coarse = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (narrow || coarse || prefersReducedMotion()) return;

    const { supportsWebGL } = await import("./three/renderer");
    if (!supportsWebGL()) return;

    // El módulo se rearma en cada navegación; si el hueco ya no es el mismo nodo
    // —swap del router a media carga— lo montado aquí sobraría.
    const stale = () => !slot.isConnected;

    let instance: AvatarHandle;
    try {
        const { createAvatarScene } = await import("./three/avatar-scene");
        if (stale()) return;
        instance = await createAvatarScene(slot, modelUrl);
    } catch (error) {
        console.warn("La figura 3D no se pudo cargar; queda el render.", error);
        return;
    }

    if (stale()) {
        instance.destroy();
        return;
    }

    avatar = instance;
    // La imagen se retira sólo cuando hay algo que la sustituya, y con un
    // fundido: el cambio de render a modelo no es exacto y un corte seco lo
    // delata.
    slot.dataset.avatarLive = "";

    cleanup = wire(instance, slot);
}

/** El cursor manda la pose; salir de pantalla para el bucle. */
function wire(instance: AvatarHandle, slot: HTMLElement): () => void {
    const onPointerMove = (event: PointerEvent) => {
        instance.setPointer(
            (event.clientX / window.innerWidth) * 2 - 1,
            (event.clientY / window.innerHeight) * 2 - 1,
        );
    };

    // Al salir de la ventana la figura vuelve al frente, en vez de quedarse
    // mirando al último borde por el que pasó el cursor.
    const onLeave = () => instance.setPointer(0, 0);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    const observer = new IntersectionObserver(([entry]) => {
        instance.setActive(entry.isIntersecting);
        if (!entry.isIntersecting) onLeave();
    });
    observer.observe(slot);

    return () => {
        window.removeEventListener("pointermove", onPointerMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("blur", onLeave);
        observer.disconnect();
        delete slot.dataset.avatarLive;
    };
}

export function destroyAvatar(): void {
    cleanup?.();
    cleanup = null;
    avatar?.destroy();
    avatar = null;
}
