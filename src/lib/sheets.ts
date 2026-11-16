/**
 * Apertura y cierre de las fichas (`Sheet.astro`).
 *
 * Delegado en `document` y montado una sola vez: sirve para cualquier ficha de
 * cualquier página, también las que trae el router al navegar.
 */
let installed = false;

export function initSheets(): void {
    if (installed) return;
    installed = true;

    document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const opener = target.closest<HTMLElement>("[data-sheet-open]");
        if (opener) {
            const dialog = document.getElementById(opener.dataset.sheetOpen!);
            if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
            return;
        }

        if (target.closest("[data-sheet-close]")) {
            target.closest("dialog")?.close();
            return;
        }

        // Un clic en el propio `<dialog>` y no en su contenido es un clic en el
        // fondo oscurecido: se cierra, como cualquier modal.
        if (target instanceof HTMLDialogElement && target.classList.contains("sheet")) {
            target.close();
        }
    });
}
