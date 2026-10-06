import { prefersReducedMotion } from "./reduced-motion";

/**
 * El lema del hero, escribiéndose como en una terminal.
 *
 * El marcado trae la frase entera en dos copias —ver `Hero.astro`—: una
 * transparente que reserva la caja y es la que leen los lectores de pantalla, y
 * otra encima, marcada `aria-hidden`, que es la que este módulo vacía y vuelve a
 * llenar letra a letra. Por eso escribir aquí no mueve nada de sitio y nadie
 * recibe la frase a medias.
 *
 * Si no se monta —movimiento reducido, o el nodo no está— la copia de encima se
 * queda con el texto que ya traía del servidor. No hay estado intermedio que
 * limpiar: no hacer nada deja exactamente el resultado final.
 */

/** Milisegundos por letra. */
const SPEED = 38;

/*
 * Lo que tarda en arrancar. El saludo es lo primero que se lee y la línea de
 * arriba entra enfocándose; empezar a teclear a la vez es pedir que se miren
 * tres cosas al tiempo.
 */
const DELAY = 420;

/*
 * Una pausa extra después de cada signo de puntuación, en múltiplos de `SPEED`.
 * Es lo que separa "se está escribiendo" de "sale texto a velocidad constante":
 * al escribir de verdad se respira en las comas.
 */
const PAUSE = 6;

let cleanup: (() => void) | null = null;

export function initHeroType(): void {
    destroyHeroType();

    const node = document.querySelector<HTMLElement>("[data-hero-type]");
    if (!node) return;

    const full = (node.textContent ?? "").trim();
    if (!full) return;

    // Quien ha pedido menos movimiento no quiere ver aparecer letras. La frase
    // ya está puesta, así que basta con no tocarla.
    if (prefersReducedMotion()) return;

    let index = 0;
    let frameId: number | undefined;
    let startTimer: number | undefined;
    let next = 0;

    const stop = () => {
        if (frameId !== undefined) cancelAnimationFrame(frameId);
        window.clearTimeout(startTimer);
        frameId = undefined;
        startTimer = undefined;
    };

    const finish = () => {
        stop();
        node.textContent = full;
        delete node.dataset.typing;
    };

    const tick = (now: number) => {
        frameId = undefined;
        if (!node.isConnected) return;

        /*
         * Por reloj y no una letra por fotograma: a 144 Hz la frase saldría al
         * doble de rápido que a 60. El bucle puede escribir varias letras de
         * una pasada si el navegador se ha saltado fotogramas, que es lo que
         * mantiene el ritmo estable cuando la pestaña va justa.
         */
        while (now >= next && index < full.length) {
            index += 1;
            const extra = /[.,;:!?…]/.test(full[index - 1]) ? PAUSE : 0;
            next = now + SPEED * (1 + extra);
        }
        node.textContent = full.slice(0, index);

        if (index >= full.length) {
            // El cursor se queda: es el remate del gesto, no parte de él.
            stop();
            return;
        }
        frameId = requestAnimationFrame(tick);
    };

    node.textContent = "";
    // Enciende el cursor; el CSS lo esconde mientras no haya nadie escribiendo.
    node.dataset.typing = "";

    startTimer = window.setTimeout(() => {
        startTimer = undefined;
        if (!node.isConnected) return;
        next = performance.now();
        frameId = requestAnimationFrame(tick);
    }, DELAY);

    /*
     * Si el visitante se va de la pestaña a media frase, al volver se encuentra
     * la frase entera en vez de un trozo congelado: los temporizadores se
     * ralentizan en segundo plano y la animación perdería toda la gracia.
     */
    const onVisibility = () => {
        if (document.hidden) finish();
    };
    document.addEventListener("visibilitychange", onVisibility);

    cleanup = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        finish();
    };
}

export function destroyHeroType(): void {
    cleanup?.();
    cleanup = null;
}
