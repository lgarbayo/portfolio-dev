/**
 * Fuente única de verdad para "este visitante no quiere movimiento".
 *
 * El CSS ya neutraliza transiciones y animaciones declarativas, pero lo que
 * corre en JS —el observer de revelado, el wipe entre páginas, el avatar, la
 * escena 3D— tiene que consultarlo por su cuenta antes de arrancar nada.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
    // En SSR no hay matchMedia. Asumir "sin movimiento" es el lado seguro: el
    // HTML sale con el contenido en su estado final y el cliente ya animará si
    // el visitante lo permite.
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia(QUERY).matches;
}

/**
 * Avisa cuando la preferencia cambia en caliente (el visitante la toca en el
 * sistema con la pestaña abierta). Devuelve la función para dejar de escuchar.
 */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};

    const media = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => callback(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
}
