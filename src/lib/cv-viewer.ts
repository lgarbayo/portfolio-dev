/**
 * Visor del CV: abre el PDF en un `<dialog>` nativo.
 *
 * Lo nativo hace el trabajo aburrido —fondo modal, Escape, foco atrapado y
 * devuelto al botón que abrió— así que aquí sólo queda decidir qué PDF entra y
 * cuándo se suelta.
 *
 * El `src` del visor se pone al abrir y se quita al cerrar. Dejarlo puesto
 * mantiene el PDF cargado en memoria por cada apertura, y en móvil eso se nota.
 */

let cleanup: (() => void) | null = null;

export function initCvViewer(): void {
    cleanup?.();

    const dialog = document.querySelector<HTMLDialogElement>("[data-cv-dialog]");
    if (!dialog) return;

    const frame = dialog.querySelector<HTMLIFrameElement>("[data-cv-frame]");
    const title = dialog.querySelector<HTMLElement>("[data-cv-title]");
    const download = dialog.querySelector<HTMLAnchorElement>("[data-cv-download]");
    const newTab = dialog.querySelector<HTMLAnchorElement>("[data-cv-tab]");
    if (!frame) return;

    const open = (href: string, label: string) => {
        frame.src = href;
        if (title) title.textContent = label;
        download?.setAttribute("href", href);
        newTab?.setAttribute("href", href);
        dialog.showModal();
    };

    const close = () => {
        dialog.close();
    };

    const onClick = (event: Event) => {
        const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cv-open]");
        if (trigger) {
            open(trigger.dataset.cvOpen!, trigger.dataset.cvLabel ?? "");
            return;
        }

        if ((event.target as HTMLElement | null)?.closest("[data-cv-close]")) close();
    };

    // Pinchar fuera del contenido cierra. El diálogo ocupa toda su caja, así que
    // "fuera" es el propio `<dialog>`: cualquier clic que no venga de dentro.
    const onDialogClick = (event: MouseEvent) => {
        if (event.target === dialog) close();
    };

    // Al cerrar —por Escape, por el botón o por el fondo— se suelta el PDF.
    const onClose = () => {
        frame.removeAttribute("src");
    };

    document.addEventListener("click", onClick);
    dialog.addEventListener("click", onDialogClick);
    dialog.addEventListener("close", onClose);

    cleanup = () => {
        document.removeEventListener("click", onClick);
        dialog.removeEventListener("click", onDialogClick);
        dialog.removeEventListener("close", onClose);
        if (dialog.open) dialog.close();
        cleanup = null;
    };
}
