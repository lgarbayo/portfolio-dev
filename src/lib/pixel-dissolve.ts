import { prefersReducedMotion } from "./reduced-motion";

/**
 * El cambio de una imagen a otra deshaciéndose en píxeles.
 *
 * Lo usan las fotos de las ciudades de «Sobre mí» y la ventana de proyectos. Es
 * el mismo lenguaje que la cortina entre páginas, pero sin pasar por negro: la
 * imagen que se va se copia a un canvas encima, la nueva se pone debajo al
 * instante y los bloques del canvas se apagan en orden aleatorio, así que la
 * nueva asoma a trozos hasta quedar entera. Algún bloque se enciende justo antes
 * de apagarse.
 *
 * Sólo se dibuja la imagen saliente, con el mismo encuadre que tenía en pantalla
 * (`object-fit` y `object-position`), así que el primer fotograma del canvas es
 * idéntico a lo que ya se veía y el cambio no salta.
 *
 * Con movimiento reducido, o si la imagen saliente no ha cargado, el cambio es
 * instantáneo.
 */

const SPARK = ["rgba(235, 235, 235, 0.8)", "rgba(191, 90, 242, 0.85)"];

interface Options {
    /** Lado del bloque, en px CSS. */
    block?: number;
    duration?: number;
}

const running = new WeakMap<HTMLElement, () => void>();

/** El rectángulo que ocupa la imagen dentro de su caja, según `object-fit`. */
function placement(img: HTMLImageElement, width: number, height: number) {
    const style = getComputedStyle(img);
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale =
        style.objectFit === "contain" ? Math.min(width / iw, height / ih) : Math.max(width / iw, height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const [px = "50%", py = "50%"] = style.objectPosition.split(" ");
    const fraction = (value: string) => (value.endsWith("%") ? parseFloat(value) / 100 : 0.5);
    return { x: (width - dw) * fraction(px), y: (height - dh) * fraction(py), w: dw, h: dh };
}

/**
 * Deshace `from` sobre `host` mientras `apply` pone la imagen nueva.
 * `host` tiene que estar visible y medir lo mismo que la caja de `from`.
 */
export function pixelDissolve(
    host: HTMLElement,
    from: HTMLImageElement | null | undefined,
    apply: () => void,
    { block = 16, duration = 520 }: Options = {},
): void {
    // Un cambio a medias se da por terminado antes de empezar el siguiente.
    running.get(host)?.();

    if (prefersReducedMotion() || !from || !from.complete || from.naturalWidth === 0) {
        apply();
        return;
    }

    const box = from.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (width === 0 || height === 0) {
        apply();
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "pixel-dissolve";
    canvas.setAttribute("aria-hidden", "true");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        apply();
        return;
    }
    ctx.scale(dpr, dpr);
    const { x, y, w, h } = placement(from, width, height);
    ctx.drawImage(from, x, y, w, h);

    host.append(canvas);
    apply();

    const cols = Math.ceil(width / block);
    const rows = Math.ceil(height / block);
    const order = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
    }

    let cleared = 0;
    let frame = 0;
    const start = performance.now();
    const finish = () => {
        cancelAnimationFrame(frame);
        canvas.remove();
        running.delete(host);
    };
    running.set(host, finish);

    const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        // Arranca despacio y acaba deprisa: los primeros huecos se ven uno a uno.
        const target = Math.floor(p * p * order.length);
        for (; cleared < target; cleared++) {
            const index = order[cleared]!;
            ctx.clearRect((index % cols) * block, Math.floor(index / cols) * block, block, block);
        }
        // Los siguientes en apagarse, encendidos un instante.
        const sparks = Math.min(order.length, cleared + Math.max(2, Math.round(order.length * 0.012)));
        for (let k = cleared; k < sparks; k++) {
            const index = order[k]!;
            ctx.fillStyle = SPARK[k % SPARK.length]!;
            ctx.fillRect((index % cols) * block, Math.floor(index / cols) * block, block, block);
        }
        if (p < 1) frame = requestAnimationFrame(tick);
        else finish();
    };
    frame = requestAnimationFrame(tick);
}
