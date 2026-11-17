import { pixelDissolve } from "./pixel-dissolve";

/**
 * «Sobre mí»: qué ciudad va de fondo según lo que se lleva recorrido.
 *
 * La sección mide una pantalla por ciudad y su escenario va clavado (`sticky`).
 * Aquí sólo se calcula en qué tercio del recorrido se está y se marca con
 * `data-active` la foto, el rótulo y el crédito que tocan. La foto que se va
 * se deshace en píxeles (`pixel-dissolve.ts`); el rótulo y el crédito funden
 * con CSS. En estrecho la sección no se clava —los paneles van uno debajo de
 * otro—, pero la foto de fondo sí, y la ciudad cambia igual según lo recorrido.
 */

let cleanup: (() => void) | null = null;

export function initOverview(): void {
    destroyOverview();
    const section = document.querySelector<HTMLElement>("[data-overview]");
    if (!section) return;

    const groups = [...section.querySelectorAll<HTMLElement>("[data-place]")];
    const count = new Set(groups.map((el) => el.dataset.place)).size;
    if (count < 2) return;

    let current = 0;
    let frame = 0;

    const backdrops = section.querySelector<HTMLElement>(".overview__backdrops");

    const show = (index: number) => {
        if (index === current) return;
        const leaving = section.querySelector<HTMLImageElement>(`.overview__photo[data-place="${current}"] img`);
        current = index;
        const toggle = () => {
            for (const el of groups) el.toggleAttribute("data-active", Number(el.dataset.place) === index);
        };
        // La foto que se va se deshace en píxeles y deja ver la nueva.
        if (backdrops) pixelDissolve(backdrops, leaving, toggle, { block: 24, duration: 620 });
        else toggle();
    };

    const measure = () => {
        frame = 0;
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
