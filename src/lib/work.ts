import { prefersReducedMotion } from "./reduced-motion";

/**
 * Proyectos destacados: qué proyecto sale en la pantalla.
 *
 * El escenario va clavado y cada proyecto tiene su tramo de scroll; aquí se
 * calcula el tramo y se marca la diapositiva y la entrada de la lista. Pulsar
 * un proyecto de la lista no cambia la diapositiva a mano: desplaza hasta su
 * tramo, para que el scroll y la lista no se lleven nunca la contraria.
 */

let cleanup: (() => void) | null = null;

export function initWork(): void {
    destroyWork();
    const section = document.querySelector<HTMLElement>("[data-work]");
    const pin = section?.querySelector<HTMLElement>(".work__pin");
    if (!section || !pin) return;

    const slides = [...section.querySelectorAll<HTMLElement>("[data-work-slide]")];
    const picks = [...section.querySelectorAll<HTMLButtonElement>("[data-work-pick]")];
    const count = slides.length;
    if (count === 0) return;

    const pinned = window.matchMedia("(min-width: 62.0625rem)");
    let current = 0;
    let frame = 0;

    const show = (index: number) => {
        if (index === current) return;
        current = index;
        slides.forEach((slide, i) => slide.toggleAttribute("data-active", i === index));
        picks.forEach((pick, i) => {
            if (i === index) pick.setAttribute("aria-current", "true");
            else pick.removeAttribute("aria-current");
        });
    };

    const travel = () => pin.offsetHeight - window.innerHeight;

    const measure = () => {
        frame = 0;
        if (!pinned.matches) return;
        const distance = travel();
        if (distance <= 0) return show(0);
        const progress = Math.min(0.9999, Math.max(0, -pin.getBoundingClientRect().top / distance));
        show(Math.floor(progress * count));
    };

    const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(measure);
    };

    const onPick = (event: Event) => {
        const pick = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-work-pick]");
        if (!pick) return;
        const index = Number(pick.dataset.workPick);
        if (!pinned.matches) return show(index);
        const top = pin.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
            top: top + ((index + 0.5) / count) * travel(),
            behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    section.addEventListener("click", onPick);
    measure();

    cleanup = () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        section.removeEventListener("click", onPick);
        cancelAnimationFrame(frame);
        cleanup = null;
    };
}

export function destroyWork(): void {
    cleanup?.();
}
