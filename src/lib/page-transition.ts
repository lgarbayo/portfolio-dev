import { getWipe } from "./wipe";

/**
 * El wipe entre páginas, enganchado al ciclo de vida del ClientRouter de Astro.
 *
 * La animación en sí vive en `wipe.ts`, compartida con los saltos entre
 * secciones. Aquí sólo queda el cableado: tapar antes de cargar la página nueva
 * y destapar después del swap.
 *
 * Lo que NO se copia del repo de referencia es su router: interceptaba clics,
 * llamaba a `history.pushState()` y cambiaba el DOM a mano. Eso pelearía con el
 * routing de Astro y rompería el botón atrás.
 */

let installed = false;

export async function initPageTransition(): Promise<void> {
    // Los listeners del router son globales y sobreviven a los cambios de
    // página: una sola instalación por sesión.
    if (installed) return;
    installed = true;

    const wipe = await getWipe();
    if (!wipe) {
        // Reduced motion, de momento. Si el visitante cambia la preferencia con
        // la pestaña abierta, el siguiente arranque lo volverá a intentar.
        installed = false;
        return;
    }

    document.addEventListener("astro:before-preparation", (event) => {
        const navigation = event as Event & { loader: () => Promise<void> };
        const originalLoader = navigation.loader;

        navigation.loader = async () => {
            // Navegaciones encadenadas: si ya hay una cortina echada, esta se
            // salta la animación y se queda con la última página pedida, que es
            // lo que el visitante espera.
            if (!wipe.isBusy()) await wipe.cover();
            await originalLoader();
        };
    });

    document.addEventListener("astro:after-swap", () => {
        void wipe.reveal();
    });
}
