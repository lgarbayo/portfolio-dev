import { prefersReducedMotion } from "./reduced-motion";
import { getWipe } from "./wipe";

/**
 * El mismo wipe SVG que separa páginas, pero para los saltos de ancla dentro de
 * una misma página: los enlaces del header y los botones del hero.
 *
 * Entre secciones no hay swap de DOM que tapar, así que lo que se tapa es el
 * salto de scroll: cortina, salto instantáneo, cortina fuera. El scroll normal
 * —rueda, táctil, teclado— no se toca; esto sólo se mete cuando el visitante
 * pide ir a un sitio concreto.
 *
 * Lo que NO se hace es gestionar el historial a mano. Asignar `location.hash`
 * es exactamente lo que habría hecho el navegador con el clic que se acaba de
 * interceptar: crea la entrada de historial, respeta el `scroll-padding` del
 * header pegajoso y deja el botón atrás intacto. Un `pushState` propio se
 * pelearía con el ClientRouter de Astro por el mismo historial.
 */

let installed = false;

export function initSectionTransition(): void {
    // El listener vive en `document` y está delegado: sobrevive a los cambios
    // de página del router, así que se instala una sola vez por sesión.
    if (installed) return;
    installed = true;

    // En captura, y esto no es un detalle: el ClientRouter de Astro se engancha
    // a los clics de *todos* los enlaces del mismo origen, anclas incluidas, y
    // llama a `preventDefault()` en su turno. La fase de captura corre antes que
    // cualquier listener de burbuja, así que llegamos primero; Astro se
    // encuentra el evento ya prevenido y se aparta solo.
    //
    // Lo que no se hace es `stopPropagation()`: el menú móvil se cierra con su
    // propio listener sobre el clic del enlace, y cortarle el evento lo dejaría
    // abierto encima de la sección recién abierta.
    document.addEventListener("click", onClick, { capture: true });
}

function onClick(event: MouseEvent): void {
    // Sólo el clic primario y sin modificadores: ctrl/cmd/shift abren en otra
    // pestaña o ventana, y ahí no hay nada que animar.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = (event.target as Element | null)?.closest?.("a");
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.hasAttribute("download")) return;
    if (link.target && link.target !== "_self") return;
    // El salto al contenido es una ayuda de teclado: tiene que llevar donde
    // dice ya, sin medio segundo de cortina por delante.
    if (link.classList.contains("skip-link")) return;

    const target = sameDocumentTarget(link);
    if (!target) return;

    event.preventDefault();
    void jump(link.hash, target);
}

/**
 * El destino del enlace si apunta a un elemento de esta misma página. Un ancla
 * que además cambia de ruta es una navegación de verdad y es cosa del router.
 */
function sameDocumentTarget(link: HTMLAnchorElement): HTMLElement | null {
    if (!link.hash || link.hash === "#") return null;
    if (link.origin !== location.origin) return null;
    if (link.pathname !== location.pathname || link.search !== location.search) return null;

    const id = decodeURIComponent(link.hash.slice(1));
    return document.getElementById(id);
}

async function jump(hash: string, target: HTMLElement): Promise<void> {
    // Se pregunta en cada clic, no una vez al arrancar: si el visitante activa
    // la preferencia con la pestaña abierta, el CSS esconde la capa al momento y
    // sin esto los saltos se quedarían esperando medio segundo a una cortina
    // que ya no se ve.
    const wipe = prefersReducedMotion() ? null : await getWipe();

    // Sin wipe —o con uno ya en marcha, que sería encadenar cortinas sobre la
    // pantalla ya tapada— el salto se hace igual: se ha llamado a
    // `preventDefault()` y el navegador ya no va a hacerlo por su cuenta.
    if (!wipe || wipe.isBusy()) {
        goTo(hash, target);
        return;
    }

    await wipe.cover();
    goTo(hash, target);
    await wipe.reveal();
}

function goTo(hash: string, target: HTMLElement): void {
    // Volver a asignar el hash que ya está puesto no mueve nada ni añade
    // historial, así que ese caso se resuelve a mano.
    if (location.hash === hash) target.scrollIntoView();
    else location.hash = hash;

    focusTarget(target);
}

/**
 * Deja el foco en la sección de destino, que es lo que habría hecho el salto de
 * ancla nativo. Sin esto el foco se queda en el enlace del header y el
 * siguiente Tab devuelve al menú en vez de entrar en lo que se acaba de abrir.
 */
function focusTarget(target: HTMLElement): void {
    if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
        // El tabindex prestado se devuelve: una sección no debería quedarse
        // como parada de foco para siempre.
        target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }

    target.focus({ preventScroll: true });
}
