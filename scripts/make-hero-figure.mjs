// Genera la figura del hero —el vídeo que gira con el cursor y su póster— a
// partir del render original.
//
//   node scripts/make-hero-figure.mjs
//
// Igual que `make-links-qr.mjs`, esto no va en la cadena de `build`: se lanza a
// mano y la salida se versiona. La fuente pesa 4,4 MB y el resultado 600 KB, así
// que recodificar en cada build sería pagar medio minuto de ffmpeg por un
// fichero que no cambia nunca.
//
// Todo lo que sigue son medidas tomadas sobre el clip, no gustos. Están aquí
// porque son justo lo que nadie podría deducir mirando el mp4 de salida.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

/*
 * La fuente por defecto es el render mejorado pasado por Real-ESRGAN x2, que
 * deja 2560x1440 (ver `scripts/upscale-hero-source.py`). No es un capricho de
 * nitidez: la placa es el FONDO del hero, o sea que se estira a lo ancho de la
 * ventana, y con los 960 px que tenía antes eso eran 3,1 aumentos en un
 * MacBook Pro de 14" y 5,3 en un 5K. Faltaban píxeles, no bits.
 */
const SOURCE = process.env.HERO_SOURCE || "assets-src/video/robot-headturn-2x.mp4";
const doubled = SOURCE.endsWith("robot-headturn-2x.mp4");
const enhanced = doubled || !SOURCE.endsWith("kling-robot-headturn.mp4");
const VIDEO_OUT = "public/assets/ui/hero-figure.mp4";
/*
 * El principal va en AV1 y el de arriba queda de reserva.
 *
 * Medido sobre este mismo arco: AV1 intra pura da la misma calidad que H.264
 * con la mitad de los bytes (535 KB contra 1048 a igual VMAF). Ese margen es
 * justo lo que paga el doble de resolución, y encima el resultado busca igual
 * de rápido —5,0 ms por salto contra 5,1— porque lo que importa aquí no es el
 * bitrate sino que todos los fotogramas sean clave.
 *
 * La reserva existe por Safari anterior al 17 y por los Mac Intel, que no
 * decodifican AV1. Sin ella se quedarían con el póster fijo y sin el giro.
 */
const AV1_OUT = "public/assets/ui/hero-figure.av1.mp4";
const POSTER_OUT = "public/assets/ui/hero-figure.webp";
const NARROW_OUT = "public/assets/ui/hero-figure-narrow.webp";

/*
 * Este clip sí es lo que hacía falta: el cuerpo se queda quieto y lo que gira es
 * la CABEZA. Nada de vueltas de 360 grados, ningún salto de pose y ninguna
 * meseta muerta — por eso el movimiento se lee tranquilo.
 *
 * Midiendo fotograma a fotograma, el 14 es el frontal exacto —los dos paneles
 * del visor de frente— y a cada lado de él la cabeza gira hacia un sitio
 * distinto. Eso es lo que permite que el robot mire a los DOS lados: antes se
 * usaba sólo el tramo de la derecha y había que elegir un lado al que mirar.
 *
 * Los dos extremos del arco giran aproximadamente lo mismo, así que a la vista
 * el gesto es simétrico; lo que no es simétrico es cuántos fotogramas tarda en
 * llegar a cada uno: 14 por un lado y 40 por el otro. Lejos de ser un problema,
 * encaja con el encuadre — el robot vive sobre el 65% del ancho, o sea que a su
 * derecha queda un tercio de pantalla y a su izquierda dos. Menos fotogramas
 * para menos recorrido del cursor.
 *
 * Se corta en el 54 a propósito: pasado ahí la cabeza queda tan de lado que el
 * visor desaparece y el robot deja de parecer que mira para parecer que se da
 * la vuelta. Es el número con el que se gradúa cuánto gira ese lado.
 *
 * El tramo va en su orden natural, así que el reposo NO está en el extremo: el
 * runtime necesita saber dónde cae el frontal, y por eso viaja aparte.
 */
const ARC = [{ from: 0, to: 54 }];

/*
 * Todos los fotogramas del tramo. Descartar uno de cada dos ahorraría la mitad
 * del peso, pero el lado corto del arco tiene sólo catorce: quitarle siete
 * dejaría el giro a la derecha a escalones bien visibles.
 */
const STEP = 1;

/** Fotogramas del resultado. El runtime lo lee del marcado, no de aquí. */
export const FRAMES = Math.ceil(ARC.reduce((n, { from, to }) => n + (to - from), 0) / STEP);

/*
 * Índice del fotograma frontal dentro del resultado, contando desde 0. En el
 * original es el 14; aquí hay que traducirlo al tramo recortado y al paso, que
 * son dos cosas distintas aunque hoy coincidan. Es la pose de reposo y la
 * bisagra entre los dos sentidos de giro, así que el runtime lo necesita.
 */
export const REST_FRAME = Math.round((14 - ARC[0].from) / STEP);
const FPS = 24;

/*
 * El espejo va horneado aquí y no en CSS.
 *
 * El arco tiene un lado largo y uno corto, y el largo tiene que caer hacia el
 * contenido —la izquierda—, que es por donde el cursor tiene el doble de
 * recorrido. Sin voltear, el clip los da al revés. Antes esto se arreglaba con
 * un `scaleX(-1)` en la hoja de estilos, pero esa transformación voltea también
 * la máscara y el encuadre, y cada ajuste había que pensarlo del revés.
 * Volteando el vídeo al generarlo, lo que se ve en el fichero es lo que se ve
 * en la web.
 *
 * La marca de agua de KlingAI vive en y 985-1045, así que el recorte de altura
 * la deja fuera por sí solo, pase lo que pase con el ancho.
 *
 * El alto —820 de 1080— se queda con el robot de cabeza a medio muslo; lo de
 * abajo lo recortaría el borde de la pantalla igual.
 *
 * El ancho es el número delicado, y no es "todo el que haya". Medido sobre la
 * placa, el robot está centrado en el píxel 1008, y 1008/1440 = 0,70: con este
 * recorte cae justo al 70% del ancho.
 *
 * Eso es exactamente lo que hace falta, porque el vídeo no es una figura sino
 * el FONDO del hero, y lo encuadra un `object-fit: cover`. Con `cover`, un
 * `object-position: P%` deja el motivo que vive en la fracción R de la imagen a
 * la fracción `P + (R - P)·(ancho_renderizado / ancho_caja)` de la caja — o
 * sea, en un sitio distinto según la forma de la ventana. Salvo cuando P = R:
 * ahí los dos términos se cancelan y el motivo cae SIEMPRE en esa misma
 * fracción, con cualquier alto y cualquier ancho.
 *
 * Así que la placa se recorta para que el robot viva en el 70%, el CSS pide
 * `object-position: 70%` y el runtime mide el cursor contra el 70%: los tres
 * números son el mismo a propósito. Antes el recorte cogía los 1916 enteros con
 * el robot en el 52% y el encuadre pegado a la izquierda, que acertaba a 1440
 * de casualidad y a 1024 sacaba media cabeza fuera de la pantalla.
 *
 * Si se cambia este recorte hay que volver a medir el robot y mover los otros
 * dos números con él.
 */
const FLIP = "hflip";
/*
 * Proporcionalmente el mismo recorte en las tres fuentes: 75% del ancho desde
 * la izquierda. Lo que cambia es de cuántos píxeles se parte — 2560, 1280 o
 * 1916— y el robot acaba en el 70% del resultado en los tres casos, que es la
 * invariante que sostiene el encuadre.
 */
const CROP = doubled
    ? "crop=1920:1092:0:0"
    : enhanced
      ? "crop=960:546:0:0"
      : "crop=1440:820:0:0";

/*
 * El fondo del clip es un gris casi neutro (#c2c4c9 de media). Esto lo sube a
 * ~#e6e6e6, que es `--color-bg`, y de paso le quita el resto de azul.
 *
 * Es el truco que sostiene todo el diseño: con el fondo del vídeo igualado al
 * de la página, y con el desvanecido de bordes que pone el CSS, el rectángulo
 * del vídeo desaparece. La alternativa —recortar al robot con un `colorkey`—
 * se probó y destroza los píxeles claros del visor.
 *
 * Si cambia `--color-bg`, estos tres números cambian con él. Están calibrados
 * contra la MEDIA del fondo del clip, que no es plano: trae su propia
 * degradación de unos 12 niveles, así que el ajuste perfecto no existe y lo que
 * queda lo disimula el desvanecido largo de los bordes en el CSS.
 */
const GRADE = enhanced
    ? "colorlevels=rimax=0.740:gimax=0.770:bimax=0.775"
    : "colorlevels=rimax=0.835:gimax=0.840:bimax=0.866";

/** Alto final. Lo fija `CROP`; esto sólo evita reescalar. */
const HEIGHT = doubled ? 1092 : enhanced ? 546 : 820;

/*
 * La reserva en H.264 se queda en 960 de ancho, que es lo que se publicaba
 * antes. No es pereza: a 1920 un H.264 intra puro se va por encima de 2,5 MB,
 * y cargarle eso justo al navegador viejo es el peor reparto posible. Sale
 * además algo mejor que el de antes aunque mida lo mismo, porque ahora baja
 * desde 1920 en vez de ser el tamaño nativo.
 */
const FALLBACK_WIDTH = 960;

/*
 * Fotograma del póster: el frontal, que es el que enseña el vídeo con el cursor
 * a la altura del robot. Es exactamente el mismo que busca `hero-video.ts` al
 * arrancar, así que el relevo del póster al vídeo no mueve nada.
 */
const POSTER_FRAME = REST_FRAME;

/*
 * Y un segundo póster, sólo para pantalla estrecha.
 *
 * Ahí el vídeo no se monta nunca —lo descarta `hero-video.ts` por ancho y por
 * puntero—, así que esto no es una imagen de más: es la única que se pide, en
 * lugar de la otra. Por eso sale barato tener dos.
 *
 * Y hace falta tener dos porque las dos formas piden recortes opuestos. La
 * placa ancha pone al robot en el 70% para dejarlo a la derecha del texto, pero
 * en estrecho el texto va centrado y él también tiene que ir centrado. Moverlo
 * desde el CSS obliga a ampliar la imagen un 67% —es la única manera de que
 * sobre anchura que gastar— y entonces de la banda sólo asoma media cabeza.
 * Recortando aquí se centra sin ampliar nada.
 *
 * Las medidas: 1200 de ancho centrados en el robot, que está en el píxel 1008
 * del fotograma volteado, y 560 de alto, que es de la cabeza al pecho. Sale una
 * proporción de 2,14, parecida a la de la banda, así que al cubrirla apenas se
 * recorta nada.
 */
const NARROW_CROP = doubled
    ? "crop=1600:748:544:0"
    : enhanced
      ? "crop=800:374:272:0"
      : "crop=1200:560:408:0";

if (!existsSync(SOURCE)) {
    // `assets-src/` está gitignorado —las fuentes pesadas no entran al
    // historial—, así que en un clon limpio este fichero no está y lo que se
    // despliega es el mp4 ya generado de `public/`. Para rehacerlo hay que
    // recuperar el render original y dejarlo en esa ruta.
    console.error(`make-hero-figure: falta ${SOURCE} (fuente original, fuera del repo)`);
    process.exit(1);
}

/*
 * El marcado declara cuántos fotogramas tiene el vídeo, porque es el runtime
 * quien los cuenta para cuantizar el scrub. Si los dos números se separan, el
 * giro se queda corto o se pasa de largo sin que falle nada: de ahí este aviso.
 */
const HERO = "src/components/sections/Hero.astro";
const markup = readFileSync(HERO, "utf8");
for (const [name, value] of [
    ["HERO_FRAMES", FRAMES],
    ["HERO_REST", REST_FRAME],
]) {
    const declared = markup.match(new RegExp(`${name} = "(\\d+)"`))?.[1];
    if (declared === String(value)) continue;
    console.error(
        `make-hero-figure: aquí ${name} sale ${value} y ${HERO} declara ${declared}.\n` +
            `  Pon ${name} = "${value}" ahí.`,
    );
    process.exit(1);
}

const trims = ARC.map(
    ({ from, to }, i) =>
        `[0:v]trim=start_frame=${from}:end_frame=${to},setpts=N/${FPS}/TB[s${i}]`,
);
const chain = ARC.map((_, i) => `[s${i}]`).join("");
const arc =
    `${trims.join(";")};${chain}concat=n=${ARC.length}:v=1:a=0,` +
    `select='not(mod(n\\,${STEP}))',setpts=N/${FPS}/TB,` +
    `${FLIP},${CROP},${GRADE},scale=-2:${HEIGHT}`;

const run = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

/*
 * `-g 1 -keyint_min 1 -sc_threshold 0` es la línea que hace que esto funcione:
 * obliga a que todos los fotogramas sean clave. Sin ello, asignar `currentTime`
 * salta al keyframe más cercano y el giro va a tirones de medio segundo. Cuesta
 * unos 200 KB sobre un encode normal y no es negociable.
 *
 * `-bf 0` quita los B-frames: con todo en claves no aportan compresión y meten
 * reordenado en el decodificador, que es justo lo que no queremos al buscar.
 *
 * En AV1 el equivalente es `-g 1` más `keyint=1`: SVT necesita las dos, porque
 * la primera fija el GOP y la segunda desactiva su propia lógica de claves.
 *
 * Los CRF no son comparables entre códecs. El 36 de AV1 y el 20 de H.264 están
 * elegidos midiendo, no por analogía: a esos valores el AV1 de 1920 pesa menos
 * que el H.264 de 960 que había antes y se ve bastante mejor.
 */
run([
    "-i", SOURCE,
    "-filter_complex", `${arc}[v]`,
    "-map", "[v]", "-an",
    "-c:v", "libsvtav1", "-pix_fmt", "yuv420p",
    "-g", "1", "-crf", "36", "-preset", "3",
    "-svtav1-params", "keyint=1",
    "-movflags", "+faststart",
    AV1_OUT,
]);

run([
    "-i", SOURCE,
    "-filter_complex", `${arc},scale=${FALLBACK_WIDTH}:-2:flags=lanczos[v]`,
    "-map", "[v]", "-an",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-g", "1", "-keyint_min", "1", "-sc_threshold", "0", "-bf", "0",
    "-crf", "20", "-preset", "slower", "-movflags", "+faststart",
    VIDEO_OUT,
]);

// Los pósteres salen del AV1, que es la placa buena: son imágenes fijas y no
// cuesta nada sacarlas de la fuente con más detalle.
run([
    "-i", AV1_OUT,
    "-vf", `select=eq(n\\,${POSTER_FRAME})`,
    "-frames:v", "1", "-c:v", "libwebp", "-quality", "92",
    POSTER_OUT,
]);

// Éste sale del original y no del mp4 ya recortado: necesita anchura a la
// izquierda del robot que aquel recorte tiró.
run([
    "-i", SOURCE,
    "-vf", `select=eq(n\\,${ARC[0].from + POSTER_FRAME * STEP}),${FLIP},${NARROW_CROP},${GRADE}`,
    "-frames:v", "1", "-c:v", "libwebp", "-quality", "92",
    NARROW_OUT,
]);

// Si alguna no sale entera en claves, el scrub irá a saltos en ese navegador y
// más vale enterarse aquí que en producción. Se comprueban las dos: son dos
// códecs distintos y cada uno tiene su manera de ignorar lo que se le pide.
let ok = true;
for (const out of [AV1_OUT, VIDEO_OUT]) {
    const keyframes = execFileSync("ffprobe", [
        "-v", "error", "-select_streams", "v",
        "-show_entries", "frame=key_frame", "-of", "csv=p=0", out,
    ])
        .toString()
        .split("\n")
        .filter(Boolean);
    const allKey = keyframes.every((k) => k.startsWith("1"));
    const size = Math.round(statSync(out).size / 1024);
    console.log(
        `make-hero-figure: ${out} (${keyframes.length} fotogramas, ${size} KB, todos clave: ${allKey ? "sí" : "NO"})`,
    );
    ok &&= allKey && keyframes.length === FRAMES;
}
console.log(`make-hero-figure: ${POSTER_OUT} (fotograma ${POSTER_FRAME})`);
console.log(`make-hero-figure: ${NARROW_OUT} (el mismo, recortado para estrecho)`);
if (!ok) process.exit(1);
