import { prefersReducedMotion } from "./reduced-motion";

/**
 * La cortina entre páginas y entre secciones: un fundido de píxeles, como el de
 * los ordenadores viejos al cambiar de pantalla.
 *
 * La pantalla se parte en bloques del tamaño de la rejilla de píxeles del
 * fondo. `cover()` los va encendiendo en orden aleatorio —cada uno destella un
 * fotograma antes de quedarse negro— hasta tapar todo; `reveal()` los apaga en
 * otro orden, y la página de debajo tiembla un instante como un CRT al volver la
 * imagen. Va partido en dos mitades porque los dos usos las necesitan separadas:
 * entre páginas hay que esperar al swap del router en medio, y entre secciones
 * hay que hacer el salto de scroll.
 *
 * Regla que manda sobre todo lo demás: **la animación puede fallar, la
 * navegación no**. Si la cortina revienta a mitad, quien la llamó sigue
 * adelante y la capa se limpia sola por tiempo: nadie se queda mirando una
 * pantalla tapada.
 */

const COVER_MS = 340;
const REVEAL_MS = 420;
/** Lado de cada bloque: el mismo paso que la rejilla de píxeles del fondo. */
const BLOCK = 24;
/** Margen tras el cual la capa se retira sola aunque nadie la haya retirado. */
const SAFETY_MS = COVER_MS + REVEAL_MS + 1200;
/** El color de los bloques al encenderse, antes de quedarse en negro. */
const SPARK = ["#ebebeb", "#9a9a9a", "#bf5af2", "#0a84ff"];

export interface Wipe {
    /** Hay cortina echada o a medio echar. */
    isBusy(): boolean;
    /** Tapa la pantalla. Resuelve cuando ya no se ve nada de lo de debajo. */
    cover(): Promise<void>;
    /** Retira la cortina. */
    reveal(): Promise<void>;
    /** Deja la capa como estaba, pase lo que pase. */
    reset(): void;
}

let pending: Promise<Wipe | null> | null = null;

/**
 * Devuelve la cortina compartida, o `null` si en este momento no se puede
 * animar (reduced motion, o la capa no está en el DOM). Quien la pida tiene que
 * saber seguir sin ella.
 */
export async function getWipe(): Promise<Wipe | null> {
    pending ??= create();
    const wipe = await pending;
    // Un `null` no se cachea: la preferencia de movimiento se puede cambiar con
    // la pestaña abierta, y la siguiente llamada debe poder volver a intentarlo.
    if (!wipe) pending = null;
    return wipe;
}

function shuffled(count: number): Uint32Array {
    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++) order[i] = i;
    for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
    }
    return order;
}

async function create(): Promise<Wipe | null> {
    if (prefersReducedMotion()) return null;

    const overlay = document.querySelector<HTMLElement>("[data-page-transition]");
    const canvas = document.querySelector<HTMLCanvasElement>("[data-transition-canvas]");
    const ctx = canvas?.getContext("2d");
    if (!overlay || !canvas || !ctx) return null;

    let busy = false;
    let safetyTimer: number | undefined;
    let frame = 0;
    let cols = 0;
    let rows = 0;

    // Un píxel de canvas por píxel CSS: los bloques tienen que verse duros,
    // sin suavizado, y no hace falta más resolución que esa.
    const size = () => {
        cols = Math.ceil(window.innerWidth / BLOCK);
        rows = Math.ceil(window.innerHeight / BLOCK);
        canvas.width = cols * BLOCK;
        canvas.height = rows * BLOCK;
    };

    const reset = () => {
        busy = false;
        window.clearTimeout(safetyTimer);
        cancelAnimationFrame(frame);
        overlay.removeAttribute("data-active");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.documentElement.removeAttribute("data-crt");
    };

    // Recorre los bloques en el orden dado a lo largo de `ms`, llamando a
    // `paint` con cada tanda; el frente de la tanda destella un fotograma.
    const run = (ms: number, step: (index: number, front: boolean) => void) =>
        new Promise<void>((resolve) => {
            const order = shuffled(cols * rows);
            const total = order.length;
            let done = 0;
            let previous: number[] = [];
            const start = performance.now();
            const tick = (now: number) => {
                const target = Math.min(total, Math.ceil(((now - start) / ms) * total));
                // La tanda anterior deja de destellar y se asienta.
                for (const index of previous) step(index, false);
                previous = [];
                for (; done < target; done++) {
                    const index = order[done]!;
                    step(index, true);
                    previous.push(index);
                }
                if (done < total) {
                    frame = requestAnimationFrame(tick);
                } else {
                    for (const index of previous) step(index, false);
                    resolve();
                }
            };
            frame = requestAnimationFrame(tick);
        });

    const block = (index: number) => [(index % cols) * BLOCK, Math.floor(index / cols) * BLOCK] as const;

    reset();
    size();
    window.addEventListener("resize", () => {
        if (!busy) size();
    });
    // Si el visitante se va en mitad de una transición y vuelve con el botón
    // atrás, el navegador puede restaurar el DOM tal cual lo dejó.
    window.addEventListener("pageshow", reset);

    return {
        isBusy: () => busy,

        async cover() {
            busy = true;
            window.clearTimeout(safetyTimer);
            safetyTimer = window.setTimeout(reset, SAFETY_MS);
            size();
            overlay.setAttribute("data-active", "");

            try {
                await run(COVER_MS, (index, front) => {
                    const [x, y] = block(index);
                    ctx.fillStyle = front ? SPARK[index % SPARK.length]! : "#000";
                    ctx.fillRect(x, y, BLOCK, BLOCK);
                });
            } catch {
                // Animación fallida: quien llamó sigue con lo suyo igual.
            }
        },

        async reveal() {
            // La red de seguridad puede haber limpiado ya: no hay nada que
            // retirar y animar ahora sólo taparía la pantalla otra vez.
            if (!busy) return;

            // La imagen vuelve temblando, como un CRT al encenderse.
            document.documentElement.setAttribute("data-crt", "");
            try {
                await run(REVEAL_MS, (index, front) => {
                    const [x, y] = block(index);
                    if (front) {
                        ctx.fillStyle = SPARK[(index * 7) % SPARK.length]!;
                        ctx.fillRect(x, y, BLOCK, BLOCK);
                    } else {
                        ctx.clearRect(x, y, BLOCK, BLOCK);
                    }
                });
            } catch {
                // Igual que arriba: lo que no puede quedarse es la capa puesta.
            }

            reset();
        },

        reset,
    };
}
