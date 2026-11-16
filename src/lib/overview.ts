import { prefersReducedMotion } from "./reduced-motion";

/**
 * «Sobre mí»: qué ciudad va de fondo según lo que se lleva recorrido.
 *
 * La sección mide una pantalla por ciudad y su escenario va clavado (`sticky`).
 * Aquí sólo se calcula en qué tercio del recorrido se está y se marca con
 * `data-active` la foto, el rótulo y el crédito que tocan; el fundido lo hace
 * el CSS. En estrecho la sección no se clava y se queda la primera ciudad.
 */

let cleanup: (() => void) | null = null;

export function initOverview(): void {
    destroyOverview();
    const section = document.querySelector<HTMLElement>("[data-overview]");
    if (!section) return;

    const groups = [...section.querySelectorAll<HTMLElement>("[data-place]")];
    const count = new Set(groups.map((el) => el.dataset.place)).size;
    if (count < 2) return;

    const pinned = window.matchMedia("(min-width: 62.0625rem)");
    let current = 0;
    let frame = 0;
    let crtTimer = 0;

    const show = (index: number) => {
        if (index === current) return;
        current = index;
        for (const el of groups) el.toggleAttribute("data-active", Number(el.dataset.place) === index);
        // Cambiar de ciudad es cambiar de canal: la imagen vuelve con el mismo
        // temblor de CRT que tras la cortina de píxeles.
        if (!prefersReducedMotion()) {
            const root = document.documentElement;
            root.removeAttribute("data-crt");
            void root.offsetWidth;
            root.setAttribute("data-crt", "");
            window.clearTimeout(crtTimer);
            crtTimer = window.setTimeout(() => root.removeAttribute("data-crt"), 450);
        }
    };

    const measure = () => {
        frame = 0;
        if (!pinned.matches) return show(0);
        const rect = section.getBoundingClientRect();
        const travel = rect.height - window.innerHeight;
        if (travel <= 0) return show(0);
        const progress = Math.min(1, Math.max(0, -rect.top / travel));
        show(Math.min(count - 1, Math.floor(progress * count)));
    };

    const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    measure();

    cleanup = () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        cancelAnimationFrame(frame);
        cleanup = null;
    };
}

export function destroyOverview(): void {
    cleanup?.();
}
