import { prefersReducedMotion } from "./reduced-motion";

/**
 * Monta la escena del teclado cuando la sección entra en pantalla, y sólo si el
 * entorno la admite.
 *
 * Los tres casos en que no se carga ni un byte de Three: pantalla estrecha, sin
 * WebGL, o movimiento reducido. En todos ellos la sección se queda con su
 * listado de tecnologías, que es el contenido real y ya está en el HTML.
 */

interface SceneApi {
    destroy: () => void;
    onActivate?: (name: string) => void;
}

let scene: SceneApi | null = null;
let observer: IntersectionObserver | null = null;
/** Vigila si el teclado está a la vista, para ceder o tomar las teclas. */
let claimObserver: IntersectionObserver | null = null;
/** Deshace lo que enganchó `wireControls` al DOM de la sección. */
let unwireControls: (() => void) | null = null;
/**
 * Cuenta los montajes para poder abandonar los que se quedaron a medias.
 *
 * Entre que el observer dispara y la escena existe hay tres `await` de imports
 * dinámicos. En ese hueco puede entrar otro `initStackScene` —el script corre al
 * evaluarse y otra vez en `astro:page-load`— y acabar con dos escenas montadas y
 * el botón de sonido enganchado dos veces, que es un botón que no hace nada:
 * cada clic activaba y desactivaba.
 */
let generation = 0;

export function initStackScene(): void {
    destroyStackScene();
    const mine = generation;

    const container = document.querySelector<HTMLElement>("[data-stack-scene]");
    if (!container) return;

    const keycaps = JSON.parse(container.dataset.keycaps ?? "[]");
    if (keycaps.length === 0) return;

    const tooNarrow = window.matchMedia("(max-width: 48rem)").matches;
    if (tooNarrow || prefersReducedMotion()) return;

    if (!("IntersectionObserver" in window)) return;

    // Se observa la sección, no el contenedor de la escena: ese nace vacío y el
    // CSS lo oculta con `:empty`, así que un elemento con `display: none` nunca
    // intersecta y el observer no dispararía jamás.
    const target = container.closest("section") ?? container;

    observer = new IntersectionObserver(
        async (entries, self) => {
            if (!entries.some((entry) => entry.isIntersecting) || scene) return;
            self.disconnect();

            const { supportsWebGL } = await import("./three/renderer");
            if (mine !== generation || !supportsWebGL()) return;

            const { createKeyboardScene } = await import("./three/keyboard-scene");
            const { loadSoundPreference, setSoundEnabled, soundEnabled } = await import(
                "./three/key-sound"
            );
            if (mine !== generation) return;

            // La escena reserva su alto sólo cuando sabe que va a pintar: así el
            // respaldo no deja un hueco vacío en las páginas donde no carga.
            // El teclado es la pieza central de la sección, no una franja
            // decorativa: ocupa el ancho de la pantalla (ver el `100vw` del CSS)
            // y buena parte del alto.
            container.style.blockSize = "clamp(420px, 78vh, 820px)";
            container.style.marginBlockEnd = "var(--space-6)";

            const instance = createKeyboardScene(container, keycaps);
            scene = instance;

            wireControls(container, instance, {
                loadSoundPreference,
                setSoundEnabled,
                soundEnabled,
            });
        },
        { rootMargin: "200px" },
    );

    observer.observe(target);
}

function wireControls(
    container: HTMLElement,
    instance: SceneApi,
    sound: {
        loadSoundPreference: () => boolean;
        setSoundEnabled: (next: boolean) => void;
        soundEnabled: () => boolean;
    },
) {
    const section = container.closest("section");
    const readout = section?.querySelector<HTMLElement>("[data-stack-readout]");
    const soundButton = section?.querySelector<HTMLButtonElement>("[data-stack-sound]");
    const hint = section?.querySelector<HTMLElement>("[data-stack-hint]");

    // La pista sobre pasar el ratón y arrastrar sólo tiene sentido con una
    // escena montada con la que hacer las dos cosas.
    if (hint) hint.hidden = false;

    const cleanups: Array<() => void> = [
        () => {
            if (hint) hint.hidden = true;
        },
    ];

    unwireControls = () => {
        cleanups.forEach((cleanup) => cleanup());
        unwireControls = null;
    };

    // Al activar una tecla se dice en texto qué tecnología es: la información no
    // puede quedarse sólo en el 3D.
    instance.onActivate = (name) => {
        if (readout) readout.textContent = name;
    };

    if (!soundButton) return;

    const render = () => {
        const on = sound.soundEnabled();
        soundButton.setAttribute("aria-pressed", String(on));
        soundButton.textContent = on
            ? soundButton.dataset.labelMute!
            : soundButton.dataset.labelUnmute!;
    };

    sound.loadSoundPreference();
    soundButton.hidden = false;
    render();

    const onClick = () => {
        sound.setSoundEnabled(!sound.soundEnabled());
        render();
    };

    soundButton.addEventListener("click", onClick);

    // El botón vive en el HTML y sobrevive a que la escena se monte y se
    // desmonte: si no se quita el listener al desmontar, se van acumulando y el
    // clic acaba encendiendo y apagando en el mismo gesto.
    cleanups.push(() => {
        soundButton.removeEventListener("click", onClick);
        soundButton.hidden = true;
    });

    // El teclado captura letras, así que mientras se está viendo se marca el
    // documento y los atajos de la página se apartan de las mismas teclas.
    //
    // La marca sigue a la visibilidad, no al montaje. Puesta al montar y
    // olvidada, se quedaba hasta recargar: bastaba pasar una vez por Stack para
    // que la G dejara de abrir el modo juego en el resto de la visita, con el
    // lanzador anunciándola igualmente.
    claimKeyboardWhileVisible(section ?? container);
}

function claimKeyboardWhileVisible(target: Element): void {
    const claim = new IntersectionObserver((entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        document.body.toggleAttribute("data-scene-keyboard", visible);
    });
    claim.observe(target);
    claimObserver = claim;
}

export function destroyStackScene(): void {
    // Invalida cualquier montaje que siguiese esperando a sus imports.
    generation += 1;
    observer?.disconnect();
    observer = null;
    claimObserver?.disconnect();
    claimObserver = null;
    unwireControls?.();
    scene?.destroy();
    scene = null;
    document.body.removeAttribute("data-scene-keyboard");
}
