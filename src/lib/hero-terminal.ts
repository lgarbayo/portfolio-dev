/**
 * La ventana de Terminal del hero: escribe cada orden letra a letra y saca su
 * salida de golpe, como una terminal de verdad.
 *
 * Todo el texto está en el HTML desde el principio —el nombre es el `<h1>`—, así
 * que sin JS, para un buscador o para un lector de pantalla no falta nada. El
 * guion inline de `Hero.astro` marca la ventana con `data-typing` antes del
 * primer pintado, y eso esconde los pasos; este módulo los va enseñando.
 *
 * Una vez por sesión: volver a la portada no obliga a ver la animación otra vez.
 * Con movimiento reducido no hay animación ninguna (el guion inline ni marca).
 */

const SEEN_KEY = "hero-typed";

let timers: number[] = [];

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
    });

export async function initHeroTerminal(): Promise<void> {
    destroyHeroTerminal();
    const terminal = document.querySelector<HTMLElement>("[data-terminal]");
    if (!terminal?.hasAttribute("data-typing")) return;

    const cursor = terminal.querySelector<HTMLElement>("[data-cursor]");
    const steps = [...terminal.querySelectorAll<HTMLElement>("[data-step]")];
    const mine = timers;

    for (const step of steps) {
        if (timers !== mine) return;
        const command = step.querySelector<HTMLElement>("[data-type]");
        step.setAttribute("data-shown", "");

        if (command) {
            const text = command.dataset.type ?? command.textContent ?? "";
            command.textContent = "";
            cursor && command.after(cursor);
            await wait(380);
            for (const char of text) {
                if (timers !== mine) return;
                command.textContent += char;
                await wait(45 + Math.random() * 55);
            }
            await wait(260);
        } else {
            await wait(70);
        }
    }

    // El cursor vuelve a su sitio: la última línea, esperando la siguiente orden.
    const home = terminal.querySelector<HTMLElement>("[data-cursor-home]");
    if (cursor && home) home.append(cursor);
    terminal.removeAttribute("data-typing");
    try {
        sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
        // Sin almacenamiento la animación se repite; no pasa nada más.
    }
}

/** Corta una animación a medias y deja la ventana entera a la vista. */
export function destroyHeroTerminal(): void {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
}
