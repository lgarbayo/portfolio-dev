/**
 * Google Analytics 4: qué se mide y cómo se envía.
 *
 * El arranque de gtag no está aquí sino en `components/Analytics.astro`, en el
 * `<head>` y en línea. Tiene que ser así: el modo de consentimiento exige que
 * los valores por defecto —todo denegado— estén puestos *antes* de que la
 * biblioteca se cargue, y un módulo diferido llegaría tarde. Este fichero se
 * ocupa de lo demás: la vista de página en cada navegación, los eventos propios
 * y las propiedades de usuario.
 *
 * Dos cosas que este sitio hace y que GA no ve solo:
 *
 *  1. **La navegación es cliente.** El `ClientRouter` de Astro cambia de página
 *     con `pushState`, así que el `page_view` automático de gtag sólo se
 *     dispararía en la primera carga. Se manda a mano en `astro:page-load`, que
 *     es después del swap y por tanto con el `<title>` correcto — la medición
 *     automática por historial se adelanta al swap y anota el título anterior.
 *     Por eso `config` lleva `send_page_view: false` y por eso hay que apagar
 *     "Cambios de página basados en eventos del historial" en la consola: si no,
 *     cada navegación cuenta dos veces.
 *
 *  2. **Casi todo lo interesante no es un enlace.** El QR, el visor del CV, el
 *     modo juego, la figura 3D, la escena del teclado, los atajos. Nada de eso
 *     cambia de URL, así que sin eventos propios la sesión entera se ve como
 *     una visita quieta.
 *
 * Ningún evento lleva datos personales: son identificadores de la interfaz
 * —qué ficha, qué sección, qué idioma—, nunca texto escrito por nadie.
 */

type ParamValue = string | number | boolean | undefined;
export type EventParams = Record<string, ParamValue>;

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        /** Guardia del arranque en línea del `<head>`; ver `Analytics.astro`. */
        __analyticsBooted?: boolean;
    }
}

/** Sin ID no hay analítica, y todo lo de este módulo se vuelve un no-op. */
export const GA_ID = import.meta.env.PUBLIC_GA_ID;

/** Umbrales de lectura de un artículo, en porcentaje. */
const PROGRESS_STEPS = [25, 50, 75, 100] as const;

let cleanup: (() => void) | null = null;
/**
 * Si esta página ya está medida.
 *
 * Duplicar el montaje duplicaría la vista de página y volvería a disparar
 * las secciones vistas, que van contra un `Set` que nace con cada montaje.
 * Lo baja `destroyAnalytics`, enganchado al swap del router.
 */
let mounted = false;

/**
 * Manda un evento.
 *
 * Silencioso a propósito cuando no hay gtag: lo llaman módulos que existen
 * igual sin analítica —el visor del CV, el juego— y ninguno debería tener que
 * preguntar antes.
 */
export function track(event: string, params: EventParams = {}): void {
    window.gtag?.("event", event, prune(params));
}

/** Los `undefined` no se mandan: GA los guardaría como la cadena "undefined". */
function prune(params: EventParams): Record<string, string | number | boolean> {
    return Object.fromEntries(
        Object.entries(params).filter((entry): entry is [string, string | number | boolean] =>
            entry[1] !== undefined,
        ),
    );
}

export function initAnalytics(): void {
    if (mounted || !GA_ID || !window.gtag) return;
    mounted = true;

    sendPageView();

    const stop = [
        trackDeclaredClicks(),
        trackSectionViews(),
        trackReadingProgress(),
        trackOutboundAndDownloads(),
    ];

    cleanup = () => {
        stop.forEach((fn) => fn());
        cleanup = null;
    };
}

export function destroyAnalytics(): void {
    cleanup?.();
    mounted = false;
}

// --- Vista de página ---------------------------------------------------------

function sendPageView(): void {
    /*
     * `set` y no parámetros sueltos del evento: así el idioma y el grupo de
     * contenido viajan también en los eventos propios que vengan después, y en
     * los informes se puede segmentar "clics en fichas del hero, en gallego"
     * sin repetir el parámetro en cada `track`.
     */
    window.gtag?.("set", {
        page_location: location.href,
        page_title: document.title,
        language: document.documentElement.lang || undefined,
        content_group: contentGroup(location.pathname),
    });

    window.gtag?.("event", "page_view");
    sendUserProperties();
}

/**
 * Qué tipo de página es esta.
 *
 * `content_group` es una dimensión que GA ya entiende, y agrupa por lo que de
 * verdad separa a estas páginas: la portada larga, el índice del blog, un
 * artículo y la página del QR se leen de maneras distintas y mezclarlas en un
 * único informe de rutas no dice nada.
 */
function contentGroup(pathname: string): string {
    // La 404 se sirve bajo la URL que se pidió, así que la ruta no la
    // identifica: la reconoce la marca que pone la propia página.
    if (document.querySelector("[data-not-found]")) return "not-found";

    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "links") return "links";
    // Fuera el prefijo de idioma, que ya viaja aparte en `language`.
    const rest = segments.slice(1);
    if (rest.length === 0) return "home";
    if (rest[0] !== "blog") return "other";
    if (rest.length === 1) return "blog-index";
    if (rest[1] === "tag") return "blog-tag";
    return "blog-post";
}

/**
 * Cómo es el navegador que está mirando, que aquí no es un dato de curiosidad.
 *
 * La portada tiene tres capas que sólo existen si el entorno da la talla: la
 * figura 3D, la escena del teclado y las animaciones. Saber qué proporción de
 * visitas puede verlas es la diferencia entre "esto no lo usa nadie" y "esto no
 * lo llega a ver nadie", que llevan a decisiones opuestas.
 */
function sendUserProperties(): void {
    window.gtag?.("set", "user_properties", {
        site_language: document.documentElement.lang || "unknown",
        reduced_motion: matchMedia("(prefers-reduced-motion: reduce)").matches ? "yes" : "no",
        pointer_type: matchMedia("(hover: hover) and (pointer: fine)").matches ? "fine" : "coarse",
        viewport_band: viewportBand(),
    });
}

function viewportBand(): string {
    const width = window.innerWidth;
    if (width < 640) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
}

// --- Clics declarados en el marcado -------------------------------------------

/**
 * Un solo listener delegado para todo lo que se marque con `data-track`.
 *
 * La alternativa era un `addEventListener` por componente, y con el router
 * cambiando el DOM en cada navegación eso son diez sitios donde acordarse de
 * desenganchar. Así el componente sólo declara qué es —`data-track="nav_click"`,
 * `data-track-nav-target="projects"`— y no importa nada de analítica.
 */
function trackDeclaredClicks(): () => void {
    const onClick = (event: MouseEvent) => {
        const trigger = (event.target as Element | null)?.closest?.<HTMLElement>("[data-track]");
        if (!trigger) return;
        track(trigger.dataset.track!, declaredParams(trigger));
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
}

/** `data-track-nav-target="x"` → `{ nav_target: "x" }`. */
function declaredParams(element: HTMLElement): EventParams {
    const params: EventParams = {};
    for (const [key, value] of Object.entries(element.dataset)) {
        if (key === "track" || !key.startsWith("track") || value === undefined) continue;
        params[snakeCase(key.slice("track".length))] = value;
    }
    return params;
}

function snakeCase(name: string): string {
    return name
        .replace(/^./, (char) => char.toLowerCase())
        .replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

// --- Secciones vistas ---------------------------------------------------------

/**
 * Qué secciones de la portada llega a ver la gente.
 *
 * La portada es una sola URL con seis secciones, así que el informe de páginas
 * dice "vio la home" y se queda tan ancho. Esto es lo que distingue a quien se
 * asoma de quien baja hasta formación.
 *
 * Una vez por carga y con la mitad de la sección a la vista: pasar de largo
 * mientras se va a otro sitio no cuenta como haberla visto.
 */
function trackSectionViews(): () => void {
    if (!("IntersectionObserver" in window)) return () => {};

    const sections = document.querySelectorAll<HTMLElement>("main section[id]");
    if (sections.length === 0) return () => {};

    const seen = new Set<string>();
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const id = entry.target.id;
                if (!entry.isIntersecting || seen.has(id)) continue;
                seen.add(id);
                track("section_view", { section_id: id });
            }
        },
        { threshold: 0.5 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
}

// --- Lectura de artículos ------------------------------------------------------

/**
 * Cuánto se lee de verdad un artículo.
 *
 * La medición mejorada de GA trae un único evento de scroll al 90%, que para
 * una portada corta vale y para un artículo largo no: no distingue entre quien
 * abandona en el primer párrafo y quien llega a la mitad. Aquí se marcan cuatro
 * cortes sobre el propio `<article>`, no sobre la página, para que el pie y la
 * cabecera no cuenten como texto leído.
 */
function trackReadingProgress(): () => void {
    // Sólo en artículos del blog. La comprobación no es de más: en la portada,
    // `main article` engancha con la primera tarjeta de proyecto y se ponía a
    // mandar progreso de lectura de una página que no tiene texto largo.
    if (contentGroup(location.pathname) !== "blog-post") return () => {};

    const article = document.querySelector<HTMLElement>("main article");
    if (!article) return () => {};

    const slug = location.pathname.split("/").filter(Boolean).pop();
    const reached = new Set<number>();

    const onScroll = () => {
        const { top, height } = article.getBoundingClientRect();
        // Cuánto del artículo ha pasado ya por el borde inferior de la ventana.
        const read = Math.min(window.innerHeight - top, height);
        if (read <= 0 || height <= 0) return;
        const percent = (read / height) * 100;

        for (const step of PROGRESS_STEPS) {
            if (percent < step || reached.has(step)) continue;
            reached.add(step);
            track("post_progress", { post_slug: slug, progress_percent: step });
        }

        if (reached.size === PROGRESS_STEPS.length) stop();
    };

    const stop = () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Un artículo corto puede caber entero en pantalla sin un solo scroll.
    onScroll();

    return stop;
}

// --- Salidas y descargas --------------------------------------------------------

/**
 * Enlaces que se van fuera y ficheros que se descargan.
 *
 * La medición mejorada de GA ya trae los dos, pero con el nombre del dominio y
 * poco más. Aquí se añade desde dónde se pulsó, que es lo que convierte "12
 * clics a GitHub" en "9 desde las fichas de proyecto y 3 desde el pie".
 *
 * Se apunta en captura y sin tocar el evento: esto observa, no decide. Cualquier
 * `preventDefault` de otro listener —el wipe entre secciones, el router— sigue
 * mandando.
 */
function trackOutboundAndDownloads(): () => void {
    const onClick = (event: MouseEvent) => {
        const link = (event.target as Element | null)?.closest?.("a");
        if (!(link instanceof HTMLAnchorElement)) return;
        // Lo que ya lleva `data-track` se cuenta con su propio nombre y no
        // necesita este genérico encima.
        if (link.closest("[data-track]")) return;

        const surface = link.closest<HTMLElement>("[data-track-surface]")?.dataset.trackSurface;

        if (link.protocol === "mailto:") {
            track("contact_click", { channel_name: "Email", channel_surface: surface });
            return;
        }

        if (link.href.startsWith("http") && link.hostname !== location.hostname) {
            track("outbound_click", { link_domain: link.hostname, channel_surface: surface });
        }
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
}
