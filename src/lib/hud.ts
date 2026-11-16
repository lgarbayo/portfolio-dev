/**
 * La barra de abajo: sección actual («03 / 07 PROYECTOS») y la hora de Madrid.
 *
 * Las secciones salen del menú (`[data-nav-section]`), que es la lista
 * canónica; así el número del menú y el del contador no se pueden separar.
 */

let observer: IntersectionObserver | null = null;
let clock = 0;

const timeFormat = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
});

export function initHud(): void {
    destroyHud();
    const hud = document.querySelector<HTMLElement>("[data-hud]");
    if (!hud) return;

    const clockEl = hud.querySelector<HTMLElement>("[data-hud-clock]");
    const tick = () => {
        if (clockEl) clockEl.textContent = timeFormat.format(new Date());
    };
    tick();
    clock = window.setInterval(tick, 30_000);

    const indexEl = hud.querySelector<HTMLElement>("[data-hud-index]");
    const totalEl = hud.querySelector<HTMLElement>("[data-hud-total]");
    const labelEl = hud.querySelector<HTMLElement>("[data-hud-label]");
    if (!indexEl || !labelEl || !("IntersectionObserver" in window)) return;

    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav-section]")];
    const sections = links
        .map((link) => ({ link, section: document.getElementById(link.dataset.navSection!) }))
        .filter((item): item is { link: HTMLAnchorElement; section: HTMLElement } => item.section !== null);
    if (sections.length === 0) return;

    const total = String(sections.length).padStart(2, "0");
    if (totalEl) totalEl.textContent = total;
    let current = -1;

    const render = (index: number) => {
        if (index === current) return;
        current = index;
        const number = String(index + 1).padStart(2, "0");
        const label = sections[index]!.link.dataset.navLabel ?? "";
        indexEl.textContent = number;
        labelEl.textContent = label;
    };

    // Una franja fina en el centro de la pantalla: la sección que la cruza es
    // la actual. Con secciones más altas que la pantalla es la única medida que
    // no duda entre dos.
    observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const index = sections.findIndex((item) => item.section === entry.target);
                if (index >= 0) render(index);
            }
        },
        { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach(({ section }) => observer!.observe(section));
}

export function destroyHud(): void {
    observer?.disconnect();
    observer = null;
    window.clearInterval(clock);
    clock = 0;
}
