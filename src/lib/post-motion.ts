import { onReducedMotionChange, prefersReducedMotion } from "./reduced-motion";

/**
 * Los clips que acompañan a cada entrada del índice del blog.
 *
 * No llevan `autoplay` en el marcado a propósito. Un `autoplay` no se puede
 * desactivar desde CSS, así que quien tenga el movimiento reducido en su sistema
 * lo vería moverse igual; y todos los de la lista se descargarían a la vez,
 * estén o no en pantalla. Aquí se decide las dos cosas: si se mueve, y cuándo.
 *
 * Sin JS no se pierde nada visible: cada vídeo enseña su póster, que es su
 * primer fotograma.
 */

let cleanup: (() => void) | null = null;

export function initPostMotion(): void {
    cleanup?.();

    const clips = [...document.querySelectorAll<HTMLVideoElement>("[data-post-motion]")];
    if (clips.length === 0) return;

    // Silenciado desde JS además de en el atributo: algunos navegadores ignoran
    // la petición de reproducir si dudan de que el vídeo sea mudo, y un clip que
    // no arranca se queda en un póster quieto sin explicación.
    clips.forEach((clip) => {
        clip.muted = true;
    });

    const play = (clip: HTMLVideoElement) => {
        // `play()` rechaza si el navegador decide que no toca —pestaña en
        // segundo plano, ahorro de batería—. No es un error que arreglar: el
        // póster sigue ahí y el siguiente cruce por pantalla lo reintenta.
        void clip.play().catch(() => {});
    };

    const stop = (clip: HTMLVideoElement) => {
        clip.pause();
        clip.currentTime = 0;
    };

    let reduced = prefersReducedMotion();

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const clip = entry.target as HTMLVideoElement;
                if (entry.isIntersecting && !reduced) play(clip);
                else stop(clip);
            }
        },
        { rootMargin: "0px 0px 10% 0px" },
    );

    clips.forEach((clip) => observer.observe(clip));

    // Si la preferencia cambia con la pestaña abierta, los clips obedecen sin
    // recargar: se paran todos, o vuelven a andar los que estén a la vista.
    const stopWatching = onReducedMotionChange((next) => {
        reduced = next;
        for (const clip of clips) {
            if (reduced) stop(clip);
            else if (isOnScreen(clip)) play(clip);
        }
    });

    cleanup = () => {
        observer.disconnect();
        stopWatching();
        clips.forEach(stop);
        cleanup = null;
    };
}

function isOnScreen(element: HTMLElement): boolean {
    const box = element.getBoundingClientRect();
    return box.bottom > 0 && box.top < window.innerHeight;
}

export function destroyPostMotion(): void {
    cleanup?.();
}
