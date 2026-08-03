/**
 * Cambiar de idioma no debería devolverte al principio.
 *
 * Los enlaces del selector se generan en build traduciendo la ruta, y la ruta no
 * sabe por dónde vas: leyendo en Formación y pulsando EN aterrizabas en la
 * bienvenida, con toda la página por delante otra vez.
 *
 * La sección actual se lee de la propia navegación: el vigía del header ya marca
 * con `data-active` el enlace de la sección que se está viendo, así que aquí sólo
 * hay que copiar ese destino al final del enlace de idioma. Se hace por
 * adelantado, cada vez que cambia la marca, y no en el momento del clic: en el
 * clic competiríamos con el router de Astro por leer el `href` primero, y quién
 * gana depende del orden en que se registraron los listeners.
 */

let stop: (() => void) | null = null;

export function initLocaleLinks(): void {
    stop?.();

    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-set-locale]")];
    const nav = document.querySelector("[data-menu]");
    if (links.length === 0) return;

    // La ruta traducida sin ancla es la base; el ancla se le añade y se le quita
    // encima, así que hay que guardarla antes de tocar nada.
    const bases = links.map((link) => [link, link.getAttribute("href") ?? ""] as const);

    const update = () => {
        const active = document.querySelector<HTMLElement>("[data-nav-section][data-active]");
        // Sin sección marcada —el blog, o la bienvenida— manda lo que diga la
        // URL, que puede traer un ancla de un enlace anterior.
        const hash = active ? `#${active.dataset.navSection}` : location.hash;
        for (const [link, base] of bases) link.setAttribute("href", `${base}${hash}`);
    };

    update();

    // El vigía del header marca y desmarca ese atributo mientras se hace scroll;
    // observarlo es más barato y más fiable que volver a calcular la sección
    // visible por nuestra cuenta.
    const observer = nav
        ? new MutationObserver(update)
        : null;
    observer?.observe(nav!, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-active"],
    });

    window.addEventListener("hashchange", update);

    stop = () => {
        observer?.disconnect();
        window.removeEventListener("hashchange", update);
        stop = null;
    };
}
