/**
 * La juntura entre secciones de la portada: una franja de píxeles que va con el
 * scroll.
 *
 * Sin esto cada sección empezaba con un borde recto —del negro del inicio se
 * pasaba de golpe a la foto de Ourense—. Aquí, alrededor de cada frontera, se
 * pintan bloques negros del paso de la rejilla del fondo: densos en la propia
 * frontera y cada vez menos al alejarse. La sección que sale se deshace en
 * píxeles hacia negro y la que entra se materializa desde él; en el frente,
 * algún bloque se enciende. Cuando la frontera llega arriba, la juntura ya se ha
 * disuelto: una sección asentada en pantalla no tiene nada encima.
 *
 * No es una animación por tiempo: cada bloque está pegado al contenido y se
 * decide con un hash fijo de su posición, así que el dibujo sólo depende de
 * dónde está el scroll. Se mueve exactamente con la rueda y no tapa nada más que
 * la franja.
 */

const BLOCK = 24;
/** Alto de la franja a cada lado de la frontera, en fracción de pantalla. */
const BAND = 0.22;
const SPARK = ["rgba(235, 235, 235, 0.55)", "rgba(191, 90, 242, 0.75)"];

let teardown: (() => void) | null = null;

/** Un número fijo entre 0 y 1 para cada bloque. */
function hash(col: number, row: number): number {
    const n = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

export function initSectionSeams(): void {
    destroySectionSeams();

    const sections = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav-section]")]
        .map((link) => document.getElementById(link.dataset.navSection!))
        .filter((section): section is HTMLElement => section !== null);
    // La frontera de cada sección con la anterior: su borde de arriba.
    const edges = sections.slice(1);
    if (edges.length === 0) return;

    const canvas = document.createElement("canvas");
    canvas.className = "seams";
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    document.body.append(canvas);

    let frame = 0;
    let width = 0;
    let height = 0;

    const size = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        // Un píxel de canvas por píxel CSS: bloques duros, sin suavizado.
        canvas.width = width;
        canvas.height = height;
    };

    const draw = () => {
        frame = 0;
        ctx.clearRect(0, 0, width, height);
        const band = height * BAND;
        const cols = Math.ceil(width / BLOCK);

        for (const section of edges) {
            const edge = section.getBoundingClientRect().top;
            if (edge < -band || edge > height + band) continue;
            // Según la frontera sube hacia el borde de arriba, la juntura se
            // disuelve: una sección asentada arriba —tras un salto del menú, o
            // clavada— queda limpia, sin bloques encima.
            const strength = Math.min(1, Math.max(0, edge / (height * 0.35)));
            if (strength <= 0) continue;

            // Las filas van pegadas al contenido (por su posición en la página),
            // para que el dibujo no tiemble al hacer scroll.
            const pageEdge = edge + window.scrollY;
            const firstRow = Math.floor((pageEdge - band) / BLOCK);
            const lastRow = Math.ceil((pageEdge + band) / BLOCK);

            for (let row = firstRow; row <= lastRow; row++) {
                const y = row * BLOCK - window.scrollY;
                if (y + BLOCK < 0 || y > height) continue;
                const distance = Math.abs(y + BLOCK / 2 - edge) / band;
                if (distance >= 1) continue;
                // Densidad: llena en la frontera, nada en el extremo de la franja.
                const cover = (1 - distance) ** 1.6 * strength;
                for (let col = 0; col < cols; col++) {
                    const h = hash(col, row);
                    if (h < cover) {
                        ctx.fillStyle = "#000";
                        ctx.fillRect(col * BLOCK, y, BLOCK, BLOCK);
                    } else if (h < cover + 0.025 * strength) {
                        ctx.fillStyle = SPARK[(col + row) % SPARK.length]!;
                        ctx.fillRect(col * BLOCK + 9, y + 9, 6, 6);
                    }
                }
            }
        }
    };

    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(draw);
    };
    const onResize = () => {
        size();
        schedule();
    };

    size();
    draw();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);

    teardown = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", onResize);
        canvas.remove();
    };
}

export function destroySectionSeams(): void {
    teardown?.();
    teardown = null;
}
