import { prefersReducedMotion } from "./reduced-motion";

/**
 * Al pasar de una sección a otra haciendo scroll en la portada:
 *
 *  - Una franja de barrido baja por la pantalla, como la de un CRT con la
 *    sincronía vertical suelta.
 *  - Los títulos de la sección se teclean letra a letra con un cursor de
 *    bloque, como en la Terminal del inicio. Sólo la primera vez que se ve
 *    cada sección.
 *
 * El texto de los títulos no se quita nunca del DOM: lo que falta por teclear
 * va en transparente, así que el título ocupa desde el principio lo mismo que
 * al final (nada salta) y un lector de pantalla lo lee entero.
 */

const TYPE_MS = 26;
const ROLL_COOLDOWN_MS = 900;

let observer: IntersectionObserver | null = null;
let roll: HTMLElement | null = null;
let timers: number[] = [];

function typeHeading(heading: HTMLElement): void {
    // Sólo títulos de texto plano: si llevan marcado dentro, no se tocan.
    if (heading.childElementCount > 0 || heading.dataset.typed !== undefined) return;
    const text = heading.textContent ?? "";
    if (!text.trim()) return;
    heading.dataset.typed = "";

    const done = document.createElement("span");
    const cursor = document.createElement("span");
    const rest = document.createElement("span");
    cursor.className = "fx-cursor";
    cursor.setAttribute("aria-hidden", "true");
    rest.className = "fx-rest";
    rest.textContent = text;
    heading.replaceChildren(done, cursor, rest);

    let index = 0;
    const tick = () => {
        index += 1;
        done.textContent = text.slice(0, index);
        rest.textContent = text.slice(index);
        if (index < text.length) {
            timers.push(window.setTimeout(tick, TYPE_MS + Math.random() * TYPE_MS));
        } else {
            // El cursor parpadea un momento al final y luego el título vuelve a
            // ser texto normal y corriente.
            timers.push(window.setTimeout(() => heading.replaceChildren(text), 700));
        }
    };
    timers.push(window.setTimeout(tick, 120));
}

export function initSectionFx(): void {
    destroySectionFx();
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;

    const sections = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav-section]")]
        .map((link) => document.getElementById(link.dataset.navSection!))
        .filter((section): section is HTMLElement => section !== null && section.id !== "hero");
    if (sections.length === 0) return;

    roll = document.createElement("div");
    roll.className = "fx-roll";
    roll.setAttribute("aria-hidden", "true");
    document.body.append(roll);

    let current: Element | null = null;
    let lastRoll = 0;

    observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting || entry.target === current) continue;
                current = entry.target;

                const now = performance.now();
                if (roll && now - lastRoll > ROLL_COOLDOWN_MS) {
                    lastRoll = now;
                    roll.removeAttribute("data-run");
                    // Forzar un reflow para que la animación vuelva a empezar.
                    void roll.offsetWidth;
                    roll.setAttribute("data-run", "");
                }

                entry.target.querySelectorAll<HTMLElement>("h2").forEach(typeHeading);
            }
        },
        { rootMargin: "-45% 0px -45% 0px" },
    );
    sections.forEach((section) => observer!.observe(section));
}

export function destroySectionFx(): void {
    observer?.disconnect();
    observer = null;
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
    roll?.remove();
    roll = null;
    // Un título a medio teclear vuelve a su texto entero.
    document.querySelectorAll<HTMLElement>("h2[data-typed]").forEach((heading) => {
        if (heading.childElementCount > 0) heading.replaceChildren(heading.textContent ?? "");
    });
}
