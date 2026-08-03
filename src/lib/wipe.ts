import { prefersReducedMotion } from "./reduced-motion";

/**
 * El wipe SVG, suelto de quién lo dispara.
 *
 * La técnica es la del repo de referencia: el trazo se mide con
 * `getTotalLength()`, se esconde con un `strokeDashoffset` igual a esa longitud
 * y se anima el offset mientras el `stroke-width` se ensancha hasta tapar la
 * pantalla. Aquí vive partido en dos mitades —`cover()` y `reveal()`— porque los
 * dos usos las necesitan separadas: entre páginas hay que esperar al swap del
 * router en medio, y entre secciones hay que hacer el salto de scroll.
 *
 * Regla que manda sobre todo lo demás: **la animación puede fallar, la
 * navegación no**. Si el wipe revienta a mitad, quien lo llamó sigue adelante y
 * la capa se limpia sola por tiempo: nadie se queda mirando una pantalla tapada.
 */

const LEAVE_MS = 500;
const ENTER_MS = 600;
/*
 * Los grosores van en unidades del viewBox (0 0 100 100), no en píxeles: con
 * `preserveAspectRatio="none"` esas 100 unidades son la pantalla entera, así que
 * 120 tapa de sobra sea cual sea el tamaño. `RETREAT` adelgaza un pelo mientras
 * el trazo se retira, que es el remate del efecto, pero sigue por encima de 100:
 * en cuanto baje de ahí asomarían los bordes de la página de debajo.
 */
const COVER_WIDTH = 120;
const RETREAT_WIDTH = 105;
/** Margen tras el cual la capa se retira sola aunque nadie la haya retirado. */
const SAFETY_MS = LEAVE_MS + ENTER_MS + 1200;

export interface Wipe {
    /** Hay cortina echada o a medio echar. */
    isBusy(): boolean;
    /** Tapa la pantalla. Resuelve cuando ya no se ve nada de lo de debajo. */
    cover(): Promise<void>;
    /** Retira la cortina por el lado contrario al que entró. */
    reveal(): Promise<void>;
    /** Deja la capa como estaba, pase lo que pase. */
    reset(): void;
}

let pending: Promise<Wipe | null> | null = null;

/**
 * Devuelve el wipe compartido, o `null` si en este momento no se puede animar
 * (reduced motion, o la capa no está en el DOM). Quien lo pida tiene que saber
 * seguir sin él.
 */
export async function getWipe(): Promise<Wipe | null> {
    pending ??= create();
    const wipe = await pending;
    // Un `null` no se cachea: la preferencia de movimiento se puede cambiar con
    // la pestaña abierta, y la siguiente llamada debe poder volver a intentarlo.
    if (!wipe) pending = null;
    return wipe;
}

async function create(): Promise<Wipe | null> {
    if (prefersReducedMotion()) return null;

    const overlay = document.querySelector<HTMLElement>("[data-page-transition]");
    const path = document.querySelector<SVGPathElement>("[data-transition-path]");
    if (!overlay || !path) return null;

    const { gsap } = await import("./gsap");

    const length = path.getTotalLength();
    let busy = false;
    let safetyTimer: number | undefined;

    const reset = () => {
        busy = false;
        window.clearTimeout(safetyTimer);
        overlay.removeAttribute("data-active");
        path.style.strokeDashoffset = String(length);
        path.style.strokeWidth = "0";
    };

    path.style.strokeDasharray = String(length);
    reset();

    // Si el visitante se va en mitad de una transición y vuelve con el botón
    // atrás, el navegador puede restaurar el DOM tal cual lo dejó.
    window.addEventListener("pageshow", reset);

    return {
        isBusy: () => busy,

        async cover() {
            busy = true;
            window.clearTimeout(safetyTimer);
            safetyTimer = window.setTimeout(reset, SAFETY_MS);
            overlay.setAttribute("data-active", "");

            try {
                await gsap
                    .timeline()
                    .to(path, {
                        strokeDashoffset: 0,
                        duration: LEAVE_MS / 1000,
                        ease: "power2.inOut",
                    })
                    .to(path, { strokeWidth: COVER_WIDTH, duration: 0.35, ease: "power2.in" }, "-=0.2");
            } catch {
                // Animación fallida: quien llamó sigue con lo suyo igual.
            }
        },

        async reveal() {
            // La red de seguridad puede haber limpiado ya: no hay nada que
            // retirar y animar ahora sólo taparía la pantalla otra vez.
            if (!busy) return;

            try {
                // El offset se va a negativo, que es lo que hace que el trazo se
                // retire por el lado contrario en vez de deshacerse por donde
                // vino.
                await gsap
                    .timeline()
                    .to(path, { strokeWidth: RETREAT_WIDTH, duration: 0.25, ease: "power2.out" })
                    .to(
                        path,
                        {
                            strokeDashoffset: -length,
                            duration: ENTER_MS / 1000,
                            ease: "power2.inOut",
                        },
                        "-=0.1",
                    );
            } catch {
                // Igual que arriba: lo que no puede quedarse es la capa puesta.
            }

            reset();
        },

        reset,
    };
}
