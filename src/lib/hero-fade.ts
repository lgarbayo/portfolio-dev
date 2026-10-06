/**
 * El hero se desvanece al bajar.
 *
 * El robot vive pegado al borde de abajo de su sección, así que en cuanto se
 * hace scroll ese borde deja de coincidir con el filo de la pantalla y el corte
 * se ve como una línea a media altura. Atenuar el hero antes de que eso ocurra
 * lo resuelve sin tocar el encuadre.
 *
 * Es decoración, así que con movimiento reducido no se monta: el hero se queda
 * opaco y el visitante simplemente ve el corte, que es lo mismo que vería
 * cualquier sección al salir de pantalla.
 */
import { prefersReducedMotion } from "./reduced-motion";

/** Fracción de la ventana en la que se completa el fundido. */
const SPAN = 0.55;

/** Por debajo de esto no se queda del todo invisible: sigue habiendo sección. */
const FLOOR = 0;

let cleanup: (() => void) | null = null;

export function initHeroFade(): void {
    destroyHeroFade();
    if (prefersReducedMotion()) return;

    const hero = document.querySelector<HTMLElement>(".hero");
    if (!hero) return;

    let frame: number | undefined;

    const apply = () => {
        frame = undefined;
        const span = window.innerHeight * SPAN;
        const progress = span > 0 ? Math.min(1, window.scrollY / span) : 1;
        const opacity = Math.max(FLOOR, 1 - progress);
        hero.style.setProperty("--hero-fade", opacity.toFixed(3));
    };

    // El scroll dispara muchas veces por gesto; el rAF deja una escritura por
    // fotograma en vez de una por evento.
    const onScroll = () => {
        if (frame === undefined) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    cleanup = () => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        hero.style.removeProperty("--hero-fade");
    };
}

export function destroyHeroFade(): void {
    cleanup?.();
    cleanup = null;
}
