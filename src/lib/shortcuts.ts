/**
 * Atajos de teclado.
 *
 * Que funcionen de verdad es el punto: unas teclas dibujadas que no hacen nada
 * son peor que no ponerlas. Tres reglas innegociables:
 *
 *  1. Nunca disparan mientras se escribe (input, textarea, contenteditable).
 *  2. Nunca disparan mientras la escena 3D captura teclas, que tiene su propio
 *     mapeo sobre las mismas letras.
 *  3. Todo atajo tiene un equivalente alcanzable con puntero.
 *
 * `Escape` y `G` los gestiona `game-mode.ts`, porque dependen del estado del
 * overlay. Aquí viven los saltos de sección.
 */

let cleanup: (() => void) | null = null;

export function isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element) return false;
    return (
        element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
    );
}

/** ¿Hay algo que esté reclamando el teclado para sí? */
export function keyboardIsClaimed(target: EventTarget | null): boolean {
    return isTypingTarget(target) || document.body.hasAttribute("data-scene-keyboard");
}

export function initShortcuts(): void {
    cleanup?.();

    const sections = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav-section]")];
    if (sections.length === 0) return;

    const onKeydown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (keyboardIsClaimed(event.target)) return;

        // 1–9 saltan a la sección n-ésima de la navegación.
        const index = Number.parseInt(event.key, 10);
        if (!Number.isNaN(index) && index >= 1 && index <= sections.length) {
            event.preventDefault();
            const link = sections[index - 1]!;
            document.getElementById(link.dataset.navSection!)?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "auto"
                    : "smooth",
            });
        }
    };

    document.addEventListener("keydown", onKeydown);

    cleanup = () => {
        document.removeEventListener("keydown", onKeydown);
        cleanup = null;
    };
}
