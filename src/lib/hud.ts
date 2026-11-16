/**
 * La barra de abajo: la ruta de la sección que se está viendo, como un prompt
 * («~/projects»).
 *
 * Las secciones salen del menú (`[data-nav-section]`), que es la lista
 * canónica. La portada (`hero`) es `~` a secas.
 */

let observer: IntersectionObserver | null = null;

export function initHud(): void {
    destroyHud();
    const pathEl = document.querySelector<HTMLElement>("[data-hud] [data-hud-path]");
    if (!pathEl || !("IntersectionObserver" in window)) return;

    const sections = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav-section]")]
        .map((link) => document.getElementById(link.dataset.navSection!))
        .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    // Una franja fina en el centro de la pantalla: la sección que la cruza es
    // la actual. Con secciones más altas que la pantalla es la única medida que
    // no duda entre dos.
    observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const id = entry.target.id;
                pathEl.textContent = id === "hero" ? "~" : `~/${id}`;
            }
        },
        { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((section) => observer!.observe(section));
}

export function destroyHud(): void {
    observer?.disconnect();
    observer = null;
}
