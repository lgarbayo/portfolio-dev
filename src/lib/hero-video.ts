import { track } from "./analytics";
import { prefersReducedMotion } from "./reduced-motion";

/**
 * Figura del hero: póster primero, vídeo gobernado por el cursor después.
 *
 * El hueco nunca está vacío. El HTML ya trae el fotograma frontal de la misma
 * figura, así que la bienvenida está completa antes de que este módulo haga
 * nada; si el vídeo llega, sustituye a la imagen, y si no llega —móvil, sin
 * puntero fino, movimiento reducido, ahorro de datos— la imagen se queda y no
 * se nota que faltaba nada.
 *
 * INVARIANTE: el vídeo está pausado toda su vida. "Reproducir" no es un estado
 * al que este módulo entre. Lo que hay es un `currentTime` que persigue al
 * cursor.
 *
 * El clip es un barrido entero de cabeza con el frontal POR DENTRO, no en un
 * extremo (ver `scripts/make-hero-figure.mjs`): a un lado del fotograma de
 * reposo la cabeza gira hacia un sitio y al otro hacia el contrario. Por eso el
 * robot mira de verdad a los dos lados, sin espejos ni trucos — el único
 * volteo que hay viene horneado en el fichero y es fijo.
 *
 * El tiempo lo manda la distancia del cursor al robot, y el reposo es la
 * bisagra: con el cursor a su altura, de frente; según se va a un lado o al
 * otro, el tiempo se aleja del reposo hacia el extremo de ese lado. Cada mitad
 * se normaliza contra el ancho de pantalla que le toca, que no es el mismo
 * —el robot no está centrado—, así que los dos extremos se alcanzan igual de
 * fácil aunque uno esté al doble de distancia.
 *
 * Es continuo y monótono a cada lado y pasa por el reposo sin salto, que es
 * justo lo que no conseguía la versión de espejo variable: aquella cambiaba la
 * imagen de golpe al cruzar el centro.
 *
 * El `<video>` se crea aquí y no en la plantilla a propósito: así, en todo lo
 * que no pase las puertas de abajo, el fichero ni siquiera se pide. Es lo
 * contrario de `GameLauncher.astro`, que sí declara el suyo en el marcado
 * porque su preview se reproduce también en táctil.
 */

/** Constante del amortiguado: cuanto más alta, más pegado va al cursor. */
const FOLLOW = 6;

/*
 * El 10% de cada borde satura. Sin esto, los dos extremos del giro sólo se
 * alcanzan con el cursor pegado al borde de la ventana, que es perseguir un
 * píxel.
 */
const EDGE = 0.1;

/** Si `seeked` no llega en este tiempo, se deja de esperarlo. */
const SEEK_TIMEOUT = 400;

/** Margen para dar por bueno el reposo y aparcar el bucle. */
const SETTLED = 0.001;

type HeroStatus = "ready" | "skipped_environment" | "skipped_decode" | "failed";

/*
 * Qué acabó viendo el visitante en el hueco de la figura.
 *
 * Es el dato que más falta hace de toda la portada: el vídeo cuesta 426 KB y
 * las puertas de abajo lo descartan en móvil, en táctil, con movimiento
 * reducido y con ahorro de datos. Sin medirlo no hay forma de saber si ese
 * trabajo lo ve la mayoría o una minoría, y las dos respuestas llevan a
 * decisiones opuestas sobre dónde seguir invirtiendo.
 *
 * Evento nuevo y no el `avatar_3d` de la figura anterior: la pregunta es la
 * misma, pero lo que se mide es otra cosa y falla de otras maneras. Reusar el
 * nombre mezclaría dos series y haría ilegible el antes y el después.
 */
function report(status: HeroStatus): void {
    track("hero_video", { hero_status: status });
}

let cleanup: (() => void) | null = null;

export function initHeroVideo(): void {
    destroyHeroVideo();

    const slot = document.querySelector<HTMLElement>("[data-hero-figure]");
    if (!slot) return;

    const src = slot.dataset.video;
    // Sin vídeo no hay nada que montar. La imagen ya está puesta.
    if (!src) return;

    const narrow = window.matchMedia("(max-width: 56rem)").matches;
    const coarse = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // Medio mega de adorno es exactamente lo que Save-Data existe para evitar.
    const saveData = Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );
    if (narrow || coarse || prefersReducedMotion() || saveData) {
        report("skipped_environment");
        return;
    }

    const frames = Number(slot.dataset.frames);
    const fps = Number(slot.dataset.fps);
    if (!Number.isFinite(frames) || !Number.isFinite(fps) || frames < 2 || fps <= 0) {
        report("failed");
        return;
    }

    /*
     * El vídeo cubre el hero entero, así que el robot no está en el centro de la
     * caja: el recorte lo deja sobre el 62% del ancho, y es contra ESE punto
     * contra el que se mide la distancia del cursor. Lo declara el marcado,
     * junto al fichero que lo decide.
     */
    const anchorRatio = Number(slot.dataset.anchor);
    const ratio = Number.isFinite(anchorRatio) && anchorRatio > 0 && anchorRatio <= 1
        ? anchorRatio
        : 0.5;

    /*
     * Fotograma de reposo: el frontal. No se deduce aquí porque no se puede —
     * depende de dónde cayera el frontal al recortar el arco, y eso lo sabe el
     * script que genera el fichero. Si falta, el reposo es el primer fotograma,
     * que era el comportamiento de cuando el arco empezaba de frente.
     */
    const restFrame = Number(slot.dataset.rest);
    const rest = Number.isInteger(restFrame) && restFrame >= 0 && restFrame < frames
        ? restFrame
        : 0;

    cleanup = mount(slot, src, frames, fps, ratio, rest);
}

function mount(
    slot: HTMLElement,
    src: string,
    frames: number,
    fps: number,
    anchorRatio: number,
    restFrame: number,
): () => void {
    const video = document.createElement("video");
    video.className = "hero__figure-video";
    // Atributos y propiedades: Safari lee las propiedades, no los atributos.
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.tabIndex = -1;
    video.disablePictureInPicture = true;
    video.src = src;

    /*
     * Pose de reposo, ya normalizada a 0..1: el frontal. No es un extremo del
     * clip sino un punto interior, así que además de ser a donde se vuelve al
     * salir del hero es la bisagra que separa los dos sentidos de giro.
     */
    const REST = restFrame / (frames - 1);
    let target = REST;
    let current = REST;
    let painted = -1;
    let pending: number | null = null;
    let seeking = false;
    let seekTimer: number | undefined;
    let frameId: number | undefined;
    let last = 0;
    let live = false;
    let disposed = false;
    /*
     * Centro de la figura en X. Se cachea porque leerlo en cada `pointermove`
     * fuerza un reflujo por cada movimiento del ratón. El scroll vertical no lo
     * cambia, así que basta con recalcularlo al redimensionar.
     */
    let anchor = 0;
    /*
     * Cuánta pantalla queda a cada lado del robot. Son distintos —no está
     * centrado— y es lo que normaliza cada mitad del giro. El tramo útil acaba
     * algo antes del borde para que el perfil completo se alcance sin tener que
     * pegar el ratón al filo de la ventana.
     */
    let spanStart = 1;
    let spanEnd = 1;
    const measure = () => {
        const rect = slot.getBoundingClientRect();
        anchor = rect.left + rect.width * anchorRatio;
        spanStart = Math.max((anchor - rect.left) * (1 - EDGE), 1);
        spanEnd = Math.max((rect.right - anchor) * (1 - EDGE), 1);
    };

    // El módulo se rearma en cada navegación; si el hueco ya no es el mismo
    // nodo —swap del router a media carga— lo montado aquí sobraría.
    const stale = () => disposed || !slot.isConnected;

    const timeOf = (frame: number) => (frame + 0.5) / fps;

    /*
     * Un sólo seek en vuelo. El fallo clásico en Firefox y Safari es encolar un
     * seek por cada movimiento del ratón y que el vídeo acabe segundos por
     * detrás del cursor; con esto el peor caso es enseñar una pose algo vieja,
     * nunca ir con retraso.
     *
     * `currentTime` y no `fastSeek`: `fastSeek` no existe en Chrome y lo suyo es
     * pegarse al keyframe más cercano, pero el clip va todo en claves, así que
     * `currentTime` ya coge la vía rápida y además mantiene el `seeked` del que
     * depende esta cola.
     */
    const seek = (frame: number) => {
        if (seeking) {
            pending = frame;
            return;
        }
        seeking = true;
        painted = frame;
        video.currentTime = timeOf(frame);
        window.clearTimeout(seekTimer);
        seekTimer = window.setTimeout(onSeeked, SEEK_TIMEOUT);
    };

    function onSeeked(): void {
        window.clearTimeout(seekTimer);
        seeking = false;
        if (stale()) return;
        if (pending !== null) {
            const next = pending;
            pending = null;
            if (next !== painted) seek(next);
        }
    }

    const tick = (now: number) => {
        frameId = undefined;
        if (stale()) return;

        const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;

        // Paso por tiempo real: el giro tarda lo mismo a 60 Hz que a 144. Es la
        // misma ley que usaba la figura 3D, para que el tacto no cambie.
        const k = 1 - Math.exp(-FOLLOW * delta);
        current += (target - current) * k;

        const frame = Math.round(current * (frames - 1));
        if (frame !== painted) seek(frame);

        // Aparcar en reposo: sin esto el rAF corre eternamente sin pintar nada.
        if (Math.abs(target - current) < SETTLED && !seeking) {
            current = target;
            last = 0;
            return;
        }
        frameId = requestAnimationFrame(tick);
    };

    const wake = () => {
        if (frameId !== undefined || stale() || !live) return;
        last = 0;
        frameId = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
        /*
         * Cuánto se ha ido el cursor del robot hacia su lado, de 0 a 1, medido
         * contra el hueco que hay por ESE lado y no contra media ventana: el
         * robot está sobre el 65% del ancho, así que a su izquierda queda el
         * doble de sitio que a su derecha. Normalizando cada mitad por separado,
         * llegar al perfil cuesta lo mismo mirando a un lado que al otro.
         */
        const x = event.clientX;
        const away = Math.min(1, Math.abs(anchor - x) / (x <= anchor ? spanStart : spanEnd));
        // A la izquierda el tiempo sube desde el reposo; a la derecha baja.
        target = x <= anchor ? REST + away * (1 - REST) : REST - away * REST;
        wake();
    };

    // Al salir de la ventana la figura vuelve al frente, en vez de quedarse
    // mirando al último borde por el que pasó el cursor.
    const onLeave = () => {
        target = REST;
        wake();
    };

    const onVisibility = () => {
        if (document.hidden) onLeave();
    };

    const onResize = () => measure();

    const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) {
            onLeave();
            return;
        }
        wake();
    });

    /*
     * Hasta que no hay un fotograma pintado de verdad no se retira el póster, y
     * se retira con un fundido. Mientras tanto el puntero no toca nada: la
     * imagen sostiene la bienvenida igual que antes.
     */
    const reveal = () => {
        if (live || stale()) return;
        live = true;
        slot.dataset.heroLive = "";
        report("ready");
        measure();
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("resize", onResize, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
        window.addEventListener("blur", onLeave);
        document.addEventListener("visibilitychange", onVisibility);
        observer.observe(slot);
    };

    let kicked = false;
    let kickTimer: number | undefined;

    const onMetadata = () => {
        if (stale()) return;
        // Primer salto, al frontal. Cuando ese fotograma esté pintado, se revela.
        seek(restFrame);

        /*
         * Apaño de WebKit: Safari a veces no decodifica un vídeo pausado que no
         * se ha reproducido nunca, y se queda en `readyState` 1 para siempre. Un
         * play/pause inmediato lo despierta; está mudo, así que no hay política
         * de autoplay que valga. Una sola vez.
         */
        kickTimer = window.setTimeout(() => {
            if (stale() || live || video.readyState > HTMLMediaElement.HAVE_METADATA) return;
            if (kicked) {
                report("skipped_decode");
                return;
            }
            kicked = true;
            void video
                .play()
                .then(() => {
                    video.pause();
                    seeking = false;
                    seek(restFrame);
                })
                .catch(() => report("skipped_decode"));
        }, 1000);
    };

    const onFirstPaint = () => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) reveal();
    };

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("seeked", () => {
        onSeeked();
        onFirstPaint();
    });
    video.addEventListener("error", () => {
        console.warn("El vídeo del hero no se pudo cargar; queda el póster.");
        report("failed");
    });

    slot.appendChild(video);
    // Pausado desde el primer instante: nada de esto es reproducción.
    video.pause();

    return () => {
        disposed = true;
        if (frameId !== undefined) cancelAnimationFrame(frameId);
        window.clearTimeout(seekTimer);
        window.clearTimeout(kickTimer);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("blur", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        observer.disconnect();
        delete slot.dataset.heroLive;
        // Soltar el decodificador y cortar la descarga en curso: no hacerlo es
        // la fuga clásica al navegar entre páginas con el router.
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
    };
}

export function destroyHeroVideo(): void {
    cleanup?.();
    cleanup = null;
}
