import { prefersReducedMotion } from "./reduced-motion";

/**
 * El retrato del hero: la foto recortada, a color, animada con un shader.
 *
 * La foto la saca `scripts/portrait/make_portrait.py`, ya recortada y con alfa
 * (`portrait.webp`).
 *
 * Lo que se mueve —y nada de ello deforma la cara, que es lo que hacían la lupa
 * y el 2.5D de la primera versión—:
 *  - Al entrar, se resuelve de mosaico grueso a nítido, a saltos.
 *  - Sigue al cursor entera, como una tarjeta: se desplaza e inclina un pelo,
 *    sin que cambie nada dentro. En móvil sigue la inclinación del teléfono,
 *    donde el navegador la da sin pedir permiso. Si no, se balancea sola.
 *  - De vez en cuando, un fallo de CRT: franjas desplazadas y los canales de
 *    color separados durante un instante.
 *
 * Sin WebGL, sin JS o con movimiento reducido se queda la foto fija, que es la
 * misma imagen.
 */

const INTRO_MS = 1100;
/** Cuánto se desplaza (px) y se inclina (grados) siguiendo al cursor. */
const FOLLOW_PX = 10;
const FOLLOW_DEG = 2.5;

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
    v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_color;
uniform vec2 u_size;      // tamaño del canvas en px CSS
uniform float u_block;    // tamaño del mosaico de entrada, en px
uniform float u_glitch;   // 0..1
uniform float u_time;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
    vec2 px = v_uv * u_size;
    if (u_block > 1.0) px = (floor(px / u_block) + 0.5) * u_block;
    vec2 uv = px / u_size;

    // Fallo de CRT: franjas horizontales desplazadas y canales separados.
    float split = 0.0;
    if (u_glitch > 0.0) {
        float band = floor(uv.y * 26.0);
        float r = hash(band + floor(u_time * 24.0));
        if (r > 0.72) uv.x += (r - 0.86) * 0.12 * u_glitch;
        split = 0.006 * u_glitch;
    }

    vec4 c = texture2D(u_color, uv);
    if (split > 0.0) {
        c.r = texture2D(u_color, uv + vec2(split, 0.0)).r;
        c.b = texture2D(u_color, uv - vec2(split, 0.0)).b;
    }
    gl_FragColor = vec4(c.rgb * c.a, c.a);
}`;

let teardown: (() => void) | null = null;
let generation = 0;

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
    }
    return shader;
}

function texture(gl: WebGLRenderingContext, unit: number, img: HTMLImageElement): WebGLTexture {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

export async function initHeroPortrait(): Promise<void> {
    destroyHeroPortrait();
    const mine = generation;

    const container = document.querySelector<HTMLElement>("[data-hero-portrait]");
    const still = container?.querySelector<HTMLImageElement>(".hero__portrait-still");
    if (!container || !still) return;
    // Pase lo que pase a partir de aquí, la foto fija deja de estar escondida
    // en cuanto se sale de esta función sin escena.
    const giveUp = () => {
        if (mine === generation) container.removeAttribute("data-pending");
    };
    if (prefersReducedMotion()) return giveUp();

    let colorImg: HTMLImageElement;
    try {
        colorImg = await loadImage(still.currentSrc || still.src);
    } catch {
        return giveUp();
    }
    if (mine !== generation) return;

    const canvas = document.createElement("canvas");
    canvas.className = "hero__portrait-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return giveUp();

    let program: WebGLProgram;
    try {
        program = gl.createProgram()!;
        gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
        gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    } catch {
        return giveUp();
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    texture(gl, 0, colorImg);
    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform1i(u("u_color"), 0);
    const uSize = u("u_size");
    const uBlock = u("u_block");
    const uGlitch = u("u_glitch");
    const uTime = u("u_time");

    // El canvas ocupa exactamente la caja que pinta la foto fija (`contain`),
    // para que el cambio de una a otro no se note.
    let width = 0;
    let height = 0;
    const layout = () => {
        width = still.clientWidth;
        height = still.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.style.left = `${still.offsetLeft}px`;
        canvas.style.top = `${still.offsetTop}px`;
        gl.viewport(0, 0, canvas.width, canvas.height);
    };

    still.after(canvas);
    layout();
    container.setAttribute("data-live", "");
    container.removeAttribute("data-pending");

    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    let hasPointer = false;
    let glitchUntil = 0;
    let nextGlitch = performance.now() + 3000 + Math.random() * 3000;
    let visible = true;
    let frame = 0;
    const start = performance.now();

    const onPointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        hasPointer = true;
        const box = canvas.getBoundingClientRect();
        look.tx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)));
        look.ty = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2)));
    };

    // El móvil inclinado hace de cursor. iOS sólo da la orientación tras pedir
    // permiso con un toque, y no merece un diálogo: ahí se queda el balanceo.
    let tiltBase: number | null = null;
    const onTilt = (event: DeviceOrientationEvent) => {
        if (event.gamma === null || event.beta === null) return;
        // La primera lectura es la postura en la que se sostiene el móvil: se
        // cuenta desde ahí, no desde el móvil plano sobre la mesa.
        tiltBase ??= event.beta;
        hasPointer = true;
        look.tx = Math.max(-1, Math.min(1, event.gamma / 25));
        look.ty = Math.max(-1, Math.min(1, (event.beta - tiltBase) / 25));
    };

    const render = (now: number) => {
        frame = visible ? requestAnimationFrame(render) : 0;
        const t = now - start;

        // Entrada: el mosaico baja de 40 px a nítido en pasos, no en continuo.
        const p = Math.min(1, t / INTRO_MS);
        const steps = [40, 24, 16, 10, 6, 3, 1];
        const block = steps[Math.min(steps.length - 1, Math.floor(p * steps.length))]!;

        if (!hasPointer) {
            look.tx = Math.sin(t / 2600) * 0.55;
            look.ty = Math.sin(t / 3700) * 0.25;
        }
        look.x += (look.tx - look.x) * 0.06;
        look.y += (look.ty - look.y) * 0.06;
        // La foto entera, como una tarjeta: se mueve sin que cambie nada dentro.
        canvas.style.transform =
            `translate(${(look.x * FOLLOW_PX).toFixed(2)}px, ${(look.y * FOLLOW_PX * 0.5).toFixed(2)}px) ` +
            `perspective(1200px) rotateY(${(look.x * FOLLOW_DEG).toFixed(2)}deg) rotateX(${(-look.y * FOLLOW_DEG * 0.6).toFixed(2)}deg)`;

        if (now > nextGlitch && p >= 1) {
            glitchUntil = now + 140 + Math.random() * 120;
            nextGlitch = now + 3500 + Math.random() * 4500;
        }
        const glitch = now < glitchUntil ? 1 : 0;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uSize, width, height);
        gl.uniform1f(uBlock, block);
        gl.uniform1f(uGlitch, glitch);
        gl.uniform1f(uTime, t / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const resize = new ResizeObserver(layout);
    resize.observe(still);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onTilt);

    // Fuera de pantalla no se dibuja nada.
    const io = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible && !frame) frame = requestAnimationFrame(render);
    });
    io.observe(container);
    frame = requestAnimationFrame(render);

    teardown = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("deviceorientation", onTilt);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
    };
}

export function destroyHeroPortrait(): void {
    generation += 1;
    teardown?.();
    teardown = null;
    document.querySelector("[data-hero-portrait]")?.removeAttribute("data-live");
}
