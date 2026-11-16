import { prefersReducedMotion } from "./reduced-motion";
import { supportsWebGL } from "./three/support";

/**
 * Contacto: copiar el correo con un clic y montar el globo cuando se ve.
 *
 * El globo sigue la misma regla que el retrato del hero: la imagen fija va en
 * el HTML, y la escena sólo se carga en escritorio, con WebGL, sin movimiento
 * reducido y cuando la sección se acerca a la pantalla.
 */

let cleanup: (() => void) | null = null;
let generation = 0;

export function initContact(): void {
    destroyContact();
    const mine = generation;
    const section = document.getElementById("contact");
    if (!section) return;

    const disposers: Array<() => void> = [];

    // --- Copiar el correo ---
    const copyButton = section.querySelector<HTMLButtonElement>("[data-copy]");
    const status = copyButton?.querySelector<HTMLElement>("[data-copy-status]");
    const idle = status?.textContent ?? "";
    let reset = 0;
    const onCopy = async () => {
        if (!copyButton) return;
        try {
            await navigator.clipboard.writeText(copyButton.dataset.copy ?? "");
            if (status) status.textContent = copyButton.dataset.copiedLabel ?? idle;
            window.clearTimeout(reset);
            reset = window.setTimeout(() => {
                if (status) status.textContent = idle;
            }, 1800);
        } catch {
            // Sin permiso para el portapapeles, el correo se abre como enlace.
            window.location.href = `mailto:${copyButton.dataset.copy}`;
        }
    };
    copyButton?.addEventListener("click", onCopy);
    disposers.push(() => {
        copyButton?.removeEventListener("click", onCopy);
        window.clearTimeout(reset);
    });

    // --- Globo ---
    const container = section.querySelector<HTMLElement>("[data-contact-globe]");
    const labels = section.querySelector<HTMLElement>("[data-globe-labels]");
    const canMount =
        container &&
        labels &&
        !prefersReducedMotion() &&
        window.matchMedia("(min-width: 48rem) and (any-pointer: fine)").matches &&
        "IntersectionObserver" in window;

    if (canMount) {
        let scene: { destroy: () => void } | null = null;
        const observer = new IntersectionObserver(
            async (entries, self) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                self.disconnect();
                if (mine !== generation || !supportsWebGL()) return;
                const { createGlobeScene } = await import("./three/globe-scene");
                if (mine !== generation) return;
                try {
                    scene = await createGlobeScene(
                        container,
                        container.dataset.mask!,
                        JSON.parse(container.dataset.route ?? "[]"),
                        labels,
                    );
                    if (mine !== generation) return scene.destroy();
                    container.setAttribute("data-live", "");
                } catch {
                    // La imagen fija sigue ahí.
                }
            },
            { rootMargin: "300px" },
        );
        observer.observe(section);
        disposers.push(() => {
            observer.disconnect();
            scene?.destroy();
            container.removeAttribute("data-live");
        });
    }

    cleanup = () => {
        disposers.forEach((dispose) => dispose());
        cleanup = null;
    };
}

export function destroyContact(): void {
    generation += 1;
    cleanup?.();
}
