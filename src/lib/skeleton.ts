/**
 * Esqueletos para las imágenes que llegan tarde.
 *
 * Las imágenes diferidas (`loading="lazy"`) y las que piden lo mismo con
 * `data-skeleton` llevan `data-loading` mientras no están: el CSS les pone la
 * placa de carga de fondo (ver `.skeleton` en `global.css`). Al llegar se
 * cambia por `data-loaded`, que las hace entrar a saltos.
 *
 * Las que ya estaban cuando corre esto no se tocan: nada de parpadeos en lo
 * que ya se ve. Sin JS no hay placa, y la imagen carga igual.
 */

const SELECTOR = 'img[loading="lazy"], img[data-skeleton]';

let disposers: (() => void)[] = [];

function watch(img: HTMLImageElement): void {
    if (img.complete || img.dataset.loading !== undefined) return;
    img.dataset.loading = "";

    const done = (event: Event) => {
        img.removeEventListener("load", done);
        img.removeEventListener("error", done);
        delete img.dataset.loading;
        // Una imagen rota no entra: se queda su hueco sin placa.
        if (event.type === "load") img.dataset.loaded = "";
    };
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    disposers.push(() => {
        img.removeEventListener("load", done);
        img.removeEventListener("error", done);
    });
}

export function initSkeletons(root: ParentNode = document): void {
    root.querySelectorAll<HTMLImageElement>(SELECTOR).forEach(watch);
}

export function destroySkeletons(): void {
    disposers.forEach((dispose) => dispose());
    disposers = [];
}
