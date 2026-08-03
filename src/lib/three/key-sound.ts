/**
 * Sonido de las teclas.
 *
 * Sintetizado con Web Audio en vez de reproducir samples: un chasquido mecánico
 * es un golpe de ruido muy corto más un "thock" grave, y eso se genera en un
 * par de milisegundos sin descargar nada. Además da variación por tecla gratis,
 * que es justo lo que evita que suene a bucle.
 *
 * Reglas del spec que aquí se cumplen literalmente:
 *  - arranca en silencio;
 *  - no se crea el AudioContext —ni suena nada— hasta que el visitante activa el
 *    sonido a mano;
 *  - la preferencia sobrevive a la navegación.
 *
 * (Si algún día quieres samples reales de un teclado tuyo, se sustituye la
 * función `play` y el resto del contrato no cambia.)
 */

const STORAGE_KEY = "keyboard-sound";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let unlockArmed = false;

export function soundEnabled(): boolean {
    return enabled;
}

function ensureContext(): void {
    if (context) return;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.28;
    master.connect(context.destination);
}

/**
 * Deja el contexto listo para arrancar en cuanto haya un gesto de verdad.
 *
 * Un `AudioContext` creado fuera de un clic nace suspendido y no suena. Esto
 * pasa siempre que la preferencia venía guardada de otra visita: el visitante ya
 * dijo que sí, pero el navegador no se fía hasta que toque algo. Se espera al
 * primer gesto, sea cual sea, y ahí se arranca.
 */
function armUnlock(): void {
    if (unlockArmed) return;
    unlockArmed = true;

    const unlock = () => {
        void context?.resume();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
}

export function loadSoundPreference(): boolean {
    try {
        enabled = localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
        enabled = false;
    }

    // Sin esto el sonido se pierde a partir de la segunda visita: el botón dice
    // que está activado y no suena nada, porque nadie llegó a crear el contexto.
    if (enabled) {
        ensureContext();
        armUnlock();
    }

    return enabled;
}

export function setSoundEnabled(next: boolean): void {
    enabled = next;
    try {
        localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
        // Almacenamiento bloqueado: sigue funcionando en esta página.
    }

    if (!next) return;

    // Esto sí corre dentro del clic que activa el sonido, que es el momento en
    // que los navegadores dejan arrancar el audio sin más.
    ensureContext();
    void context?.resume();
}

/** Ruido blanco corto: el "clic" del contacto. */
function playClick(ctx: AudioContext, out: GainNode, when: number, pitch: number) {
    const length = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
        // Decaimiento exponencial: sin él suena a siseo, no a golpe.
        data[i] = (Math.random() * 2 - 1) * Math.exp((-i / length) * 12);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2200 * pitch;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.03);

    source.connect(filter).connect(gain).connect(out);
    source.start(when);
    source.stop(when + 0.04);
}

/** Seno grave y breve: el "thock" del fondo de recorrido. */
function playBody(ctx: AudioContext, out: GainNode, when: number, pitch: number) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180 * pitch, when);
    osc.frequency.exponentialRampToValueAtTime(90 * pitch, when + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);

    osc.connect(gain).connect(out);
    osc.start(when);
    osc.stop(when + 0.09);
}

/**
 * Suena una tecla. `seed` desafina ligeramente cada una para que dos teclas
 * distintas no suenen idénticas.
 */
export function playKeySound(seed = 0): void {
    if (!enabled) return;

    ensureContext();
    if (!context || !master) return;

    // Suspendido quiere decir que aún no ha habido gesto. Se pide arrancar y se
    // deja pasar esta: forzarla sonaría igual de mal que no sonar.
    if (context.state === "suspended") {
        void context.resume();
        return;
    }

    const pitch = 0.9 + ((seed * 37) % 20) / 100;
    const when = context.currentTime;
    playClick(context, master, when, pitch);
    playBody(context, master, when, pitch);
}
