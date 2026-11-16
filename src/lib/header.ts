/**
 * Comportamiento del header: el menú desplegable y el marcado de la sección
 * activa.
 *
 * El menú es un desplegable, no una capa: la página sigue haciendo scroll
 * detrás, y se cierra con Escape, al pulsar fuera o al seguir un enlace. Tab
 * da la vuelta dentro de él mientras está abierto, como en un menú de macOS.
 */

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let cleanup: (() => void) | null = null;

export function initHeader(): void {
    // Entre navegaciones del ClientRouter el script se vuelve a ejecutar: sin
    // esto se acumularían listeners sobre nodos ya sustituidos.
    cleanup?.();

    const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
    const menu = document.querySelector<HTMLElement>("[data-menu]");
    if (!toggle || !menu) return;

    const label = toggle.querySelector<HTMLElement>("[data-menu-label-open]");
    const openLabel = label?.dataset.menuLabelOpen ?? "";
    const closeLabel = label?.dataset.menuLabelClose ?? "";

    const isOpen = () => menu.hasAttribute("data-open");

    const open = () => {
        menu.setAttribute("data-open", "");
        toggle.setAttribute("aria-expanded", "true");
        if (label) label.textContent = closeLabel;
        menu.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    };

    const close = ({ restoreFocus = true } = {}) => {
        menu.removeAttribute("data-open");
        toggle.setAttribute("aria-expanded", "false");
        if (label) label.textContent = openLabel;
        if (restoreFocus) toggle.focus();
    };

    const onToggleClick = () => (isOpen() ? close() : open());

    const onKeydown = (event: KeyboardEvent) => {
        if (!isOpen()) return;

        if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
        }

        if (event.key !== "Tab") return;

        const focusables = [...menu.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
            (element) => element.offsetParent !== null,
        );
        if (focusables.length === 0) return;

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    };

    // Seguir un enlace del menú cierra la capa: quedarse abierta encima de la
    // sección a la que se acaba de saltar no tiene sentido.
    const onMenuClick = (event: Event) => {
        const link = (event.target as HTMLElement | null)?.closest("a, [data-open-game]");
        if (link && isOpen()) close({ restoreFocus: false });
    };

    // Pulsar fuera lo cierra, sin devolver el foco: quien ha pulsado en otra
    // parte ya ha decidido adónde va.
    const onOutside = (event: PointerEvent) => {
        if (!isOpen()) return;
        const target = event.target as Node;
        if (!menu.contains(target) && !toggle.contains(target)) close({ restoreFocus: false });
    };

    toggle.addEventListener("click", onToggleClick);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKeydown);
    menu.addEventListener("click", onMenuClick);

    const stopSectionSpy = initSectionSpy();

    cleanup = () => {
        toggle.removeEventListener("click", onToggleClick);
        document.removeEventListener("keydown", onKeydown);
        menu.removeEventListener("click", onMenuClick);
        document.removeEventListener("pointerdown", onOutside);
        stopSectionSpy();
        cleanup = null;
    };
}

/**
 * Marca en la navegación la sección que se está viendo.
 *
 * Se queda con la sección visible más alta en la página en vez de con la última
 * que disparó el observer: al hacer scroll rápido pueden entrar varias a la vez
 * y el orden de los eventos no es el orden del documento.
 */
function initSectionSpy(): () => void {
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav-section]")];
    if (links.length === 0 || !("IntersectionObserver" in window)) return () => {};

    const sections = links
        .map((link) => document.getElementById(link.dataset.navSection!))
        .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return () => {};

    const visible = new Set<string>();

    const render = () => {
        const active = sections.find((section) => visible.has(section.id))?.id;
        for (const link of links) {
            link.toggleAttribute("data-active", link.dataset.navSection === active);
        }
    };

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) visible.add(entry.target.id);
                else visible.delete(entry.target.id);
            }
            render();
        },
        // La banda central de la pantalla: una sección cuenta como "la que se
        // está viendo" cuando ocupa el medio, no cuando asoma por el borde.
        { rootMargin: "-45% 0px -45% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
}
