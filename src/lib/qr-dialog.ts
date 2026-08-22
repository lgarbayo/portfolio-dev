/**
 * El QR de la cabecera: lo abre en un `<dialog>` nativo.
 *
 * Igual que el visor del CV, lo nativo hace lo aburrido —fondo modal, Escape,
 * foco atrapado y devuelto al botón— y aquí sólo queda abrir, cerrar y no
 * dejarse listeners puestos cuando el router cambia de página.
 */

let cleanup: (() => void) | null = null;

export function initQrDialog(): void {
    cleanup?.();

    const dialog = document.querySelector<HTMLDialogElement>("[data-qr-dialog]");
    if (!dialog) return;

    const close = () => dialog.close();

    const onClick = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-qr-open]")) {
            dialog.showModal();
            return;
        }
        if (target?.closest("[data-qr-close]")) close();
    };

    // Pinchar fuera cierra. El diálogo ocupa toda su caja, así que "fuera" es el
    // propio `<dialog>`: cualquier clic que no venga de dentro.
    const onDialogClick = (event: MouseEvent) => {
        if (event.target === dialog) close();
    };

    document.addEventListener("click", onClick);
    dialog.addEventListener("click", onDialogClick);

    cleanup = () => {
        document.removeEventListener("click", onClick);
        dialog.removeEventListener("click", onDialogClick);
        if (dialog.open) dialog.close();
        cleanup = null;
    };
}
