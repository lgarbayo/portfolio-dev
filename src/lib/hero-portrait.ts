import { prefersReducedMotion } from "./reduced-motion";

/**
 * El retrato del hero: arte ASCII a color, pintado en un canvas 2D.
 *
 * Los datos los saca `scripts/portrait/make_portrait.py`: un JSON con la letra
 * de cada celda y un PNG diminuto con su color (negro = vacío). Cada celda se
 * pinta como en el arte ANSI de una terminal: un fondo tenue de su color y la
 * letra encima a color pleno. Sin el fondo, la letra cubre tan poco que la cara
 * no se reconoce.
 *
 * Lo que se mueve:
 *  - Al entrar, se imprime de arriba abajo, cada línea descifrándose.
 *  - Al pasar el cursor, las letras de alrededor se revuelven y se encienden.
 *  - De vez en cuando, un tramo corto de una línea parpadea.
 *
 * Con movimiento reducido se pinta entero de una vez y ya. Sin JS se queda la
 * imagen fija de `<noscript>`, que es el mismo dibujo.
 */

// Tienen que coincidir con `CELL_FILL` del script (la proporción de la celda
// viene en el JSON).
const CELL_FILL = 0.3;
const SCRAMBLE = "!<>-_\\/[]{}=+*^?#01%$&";
// Por debajo de esto una letra ya no se lee como letra: en pantallas estrechas
// se coge una celda de cada dos.
const MIN_CELL = 4.5;
const PRINT_MS = 1300;
const HEAT_MS = 520;
const HOVER_RADIUS = 4;

interface PortraitData {
    cols: number;
    rows: number;
    cellAspect: number;
    chars: string[];
}

interface Cell {
    char: string;
    color: string;
    fill: string;
    rgb: [number, number, number];
    glyph: string;
    heat: number;
    shown: boolean;
}

let teardown: (() => void) | null = null;
let generation = 0;

const randomGlyph = () => SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]!;

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function fallback(container: HTMLElement): void {
    const still = container.dataset.still;
    if (!still || container.querySelector("img")) return;
    const img = document.createElement("img");
    img.className = "hero__portrait-still";
    img.src = still;
    img.alt = container.dataset.alt ?? "";
    container.append(img);
}

export async function initHeroPortrait(): Promise<void> {
    destroyHeroPortrait();
    const mine = generation;

    const container = document.querySelector<HTMLElement>("[data-hero-portrait]");
    const { ascii, colors } = container?.dataset ?? {};
    if (!container || !ascii || !colors) return;

    let data: PortraitData;
    let pixels: Uint8ClampedArray;
    try {
        const [json, img] = await Promise.all([
            fetch(ascii).then((response) => response.json() as Promise<PortraitData>),
            loadImage(colors),
            document.fonts?.load('700 12px "JetBrains Mono"').catch(() => undefined),
        ]);
        data = json;
        const scratch = document.createElement("canvas");
        scratch.width = data.cols;
        scratch.height = data.rows;
        const sctx = scratch.getContext("2d", { willReadFrequently: true });
        if (!sctx) throw new Error("sin 2d");
        sctx.drawImage(img, 0, 0);
        pixels = sctx.getImageData(0, 0, data.cols, data.rows).data;
    } catch {
        if (mine === generation) fallback(container);
        return;
    }
    if (mine !== generation) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        fallback(container);
        return;
    }
    container.append(canvas);
    container.setAttribute("data-live", "");

    const still = prefersReducedMotion();

    let cells: Cell[] = [];
    let cols = 0;
    let rows = 0;
    let cw = 0;
    let ch = 0;
    let font = "";

    // Rehace la rejilla para el tamaño actual: en estrecho, una celda de cada
    // dos (`step`), para que cada letra siga siendo una letra.
    const layout = () => {
        const box = container.getBoundingClientRect();
        let step = 1;
        const fit = (s: number) =>
            Math.min(box.width / Math.ceil(data.cols / s), (box.height * data.cellAspect) / Math.ceil(data.rows / s));
        while (fit(step) < MIN_CELL && step < 4) step += 1;
        cols = Math.ceil(data.cols / step);
        rows = Math.ceil(data.rows / step);
        cw = Math.floor(fit(step) * 4) / 4;
        ch = cw / data.cellAspect;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(cols * cw * dpr);
        canvas.height = Math.round(rows * ch * dpr);
        canvas.style.width = `${cols * cw}px`;
        canvas.style.height = `${rows * ch}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        font = `700 ${(ch * 0.8).toFixed(2)}px "JetBrains Mono", ui-monospace, monospace`;

        const previous = cells;
        cells = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const sx = x * step;
                const sy = y * step;
                const char = data.chars[sy]?.[sx] ?? " ";
                const i = (sy * data.cols + sx) * 4;
                const rgb: [number, number, number] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
                cells.push({
                    char,
                    color: `rgb(${rgb.join(",")})`,
                    fill: `rgba(${rgb.join(",")},${CELL_FILL})`,
                    rgb,
                    glyph: char,
                    heat: 0,
                    shown: previous.length === 0 ? still : true,
                });
            }
        }
    };

    const draw = (index: number) => {
        const cell = cells[index]!;
        const x = (index % cols) * cw;
        const y = Math.floor(index / cols) * ch;
        ctx.clearRect(x, y, cw, ch);
        if (!cell.shown || cell.char === " ") return;
        const [r, g, b] = cell.rgb;
        if (cell.heat > 0) {
            // Caliente: hacia el blanco, y el fondo de la celda más opaco.
            const k = cell.heat;
            const mix = (v: number) => Math.round(v + (255 - v) * k * 0.7);
            ctx.fillStyle = `rgba(${r},${g},${b},${CELL_FILL + 0.35 * k})`;
            ctx.fillRect(x, y, cw, ch);
            ctx.fillStyle = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
        } else {
            ctx.fillStyle = cell.fill;
            ctx.fillRect(x, y, cw, ch);
            ctx.fillStyle = cell.color;
        }
        ctx.fillText(cell.glyph, x + cw / 2, y + ch / 2 + ch * 0.04);
    };

    const drawAll = () => {
        ctx.clearRect(0, 0, cols * cw, rows * ch);
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < cells.length; i++) draw(i);
    };

    layout();
    drawAll();

    const cleanups: Array<() => void> = [];
    const resize = new ResizeObserver(() => {
        layout();
        drawAll();
    });
    resize.observe(container);
    cleanups.push(() => resize.disconnect());

    if (still) {
        teardown = () => cleanups.forEach((fn) => fn());
        return;
    }

    // --- Animación ---
    const active = new Set<number>();
    let frame = 0;
    let last = 0;
    let printed = 0;
    let printStart = 0;
    let visible = true;

    const heat = (index: number, amount: number) => {
        const cell = cells[index];
        if (!cell || cell.char === " " || !cell.shown) return;
        if (amount > cell.heat) cell.heat = amount;
        cell.glyph = randomGlyph();
        active.add(index);
    };

    const tick = (now: number) => {
        frame = 0;
        const dt = last ? Math.min(now - last, 64) : 16;
        last = now;
        ctx.font = font;

        // La impresión: líneas nuevas que entran revueltas y se descifran.
        if (printed < rows) {
            if (!printStart) printStart = now;
            const target = Math.min(rows, Math.ceil(((now - printStart) / PRINT_MS) * rows));
            for (; printed < target; printed++) {
                for (let x = 0; x < cols; x++) {
                    const index = printed * cols + x;
                    cells[index]!.shown = true;
                    heat(index, 0.9);
                }
            }
        }

        for (const index of active) {
            const cell = cells[index]!;
            cell.heat -= dt / HEAT_MS;
            if (cell.heat <= 0) {
                cell.heat = 0;
                cell.glyph = cell.char;
                active.delete(index);
            } else if (Math.random() < 0.35) {
                cell.glyph = randomGlyph();
            }
            draw(index);
        }

        if (active.size > 0 || printed < rows) schedule();
        else last = 0;
    };

    const schedule = () => {
        if (!frame && visible) frame = requestAnimationFrame(tick);
    };

    // El cursor revuelve lo que tiene alrededor.
    const onPointer = (event: PointerEvent) => {
        if (printed < rows) return;
        const box = canvas.getBoundingClientRect();
        const cx = (event.clientX - box.left) / cw;
        const cy = (event.clientY - box.top) / ch;
        if (cx < -HOVER_RADIUS || cy < -HOVER_RADIUS || cx > cols + HOVER_RADIUS || cy > rows + HOVER_RADIUS) return;
        // El radio va en celdas de ancho; en alto se corrige por la proporción
        // para que la mancha sea redonda y no un óvalo vertical.
        const ry = HOVER_RADIUS * data.cellAspect;
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            if (y < 0 || y >= rows) continue;
            for (let x = Math.floor(cx - HOVER_RADIUS); x <= Math.ceil(cx + HOVER_RADIUS); x++) {
                if (x < 0 || x >= cols) continue;
                const d = Math.hypot((x - cx) / HOVER_RADIUS, (y - cy) / ry);
                if (d < 1) heat(y * cols + x, 1 - d * 0.6);
            }
        }
        schedule();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    cleanups.push(() => window.removeEventListener("pointermove", onPointer));

    // De vez en cuando, un tramo de una línea que parpadea.
    const glitch = window.setInterval(() => {
        if (!visible || printed < rows || document.hidden) return;
        const y = Math.floor(Math.random() * rows);
        const start = Math.floor(Math.random() * cols);
        const length = 3 + Math.floor(Math.random() * 9);
        for (let x = start; x < Math.min(cols, start + length); x++) heat(y * cols + x, 0.7);
        schedule();
    }, 1800);
    cleanups.push(() => window.clearInterval(glitch));

    // Fuera de pantalla no se anima nada.
    const io = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible) schedule();
    });
    io.observe(container);
    cleanups.push(() => io.disconnect());

    cleanups.push(() => {
        if (frame) cancelAnimationFrame(frame);
    });
    schedule();

    teardown = () => cleanups.forEach((fn) => fn());
}

export function destroyHeroPortrait(): void {
    generation += 1;
    teardown?.();
    teardown = null;
    const container = document.querySelector<HTMLElement>("[data-hero-portrait]");
    container?.removeAttribute("data-live");
    container?.querySelector("canvas")?.remove();
}
