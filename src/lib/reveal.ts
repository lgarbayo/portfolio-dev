import { prefersReducedMotion } from "./reduced-motion";

/**
 * Revelado de secciones al entrar en viewport, con GSAP ScrollTrigger.
 *
 * Reglas que impone el spec y que son fáciles de romper sin querer:
 *  - una sola vez por visita: al volver a pasar por una sección ya revelada no
 *    se repite la animación;
 *  - lo que ya está en el viewport al cargar se revela sin esperar a un scroll;
 *  - con reduced motion no se anima nada: el contenido queda en su estado final
 *    y este módulo no toca el DOM más allá de marcarlo.
 *
 * El atributo `data-reveal-enabled` en <html> es lo que activa el estado inicial
 * invisible en CSS, y se pone desde aquí — sólo si vamos a animar de verdad. Si
 * este script no llega a ejecutarse, el contenido nace visible.
 */

const REVEAL_ATTR = "data-reveal";
const REVEALED_ATTR = "data-revealed";

let triggers: Array<{ kill: (revert?: boolean) => void }> = [];

export async function initReveal(root: ParentNode = document): Promise<void> {
    const targets = [...root.querySelectorAll<HTMLElement>(`[${REVEAL_ATTR}]:not([${REVEALED_ATTR}])`)];
    if (targets.length === 0) return;

    if (prefersReducedMotion()) {
        targets.forEach((target) => target.setAttribute(REVEALED_ATTR, ""));
        return;
    }

    document.documentElement.setAttribute("data-reveal-enabled", "");

    /*
     * Si GSAP no llega, se deshace el escondite y el contenido se queda visible.
     *
     * El módulo prometía que "si este script no llega a ejecutarse, el contenido
     * nace visible", y era verdad sólo si fallaba antes de empezar. Ejecutándose
     * a medias —el atributo puesto, el import caído— la promesa se rompía al
     * revés: la página entera invisible, sin error a la vista y sin nada que
     * pudiera revelarla después. Pasa de verdad: basta un chunk que no llegue.
     */
    let gsap, ScrollTrigger;
    try {
        ({ gsap, ScrollTrigger } = await import("./gsap"));
    } catch (error) {
        console.warn("El revelado no se pudo cargar; el contenido se muestra sin animar.", error);
        document.documentElement.removeAttribute("data-reveal-enabled");
        targets.forEach((target) => target.setAttribute(REVEALED_ATTR, ""));
        return;
    }

    for (const target of targets) {
        const trigger = ScrollTrigger.create({
            trigger: target,
            // Se dispara cuando el borde superior del elemento llega al 90% de
            // la pantalla: un poco antes de estar del todo a la vista, para que
            // la animación no empiece con la sección ya plantada.
            start: "top 90%",
            // `once` es lo que garantiza el "una sola vez por visita".
            once: true,
            onEnter: () => {
                target.setAttribute(REVEALED_ATTR, "");
                gsap.fromTo(
                    target,
                    { opacity: 0, y: 24 },
                    { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform" },
                );
            },
        });
        triggers.push(trigger);
    }

    // Lo que ya estaba en pantalla al cargar entra sin esperar a un scroll.
    ScrollTrigger.refresh();
}

/** Libera los triggers entre navegaciones del ClientRouter. */
export function destroyReveal(): void {
    triggers.forEach((trigger) => trigger.kill());
    triggers = [];
}
