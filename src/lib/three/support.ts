/**
 * ¿Puede este navegador pintar WebGL? Si no, cada isla usa su respaldo estático.
 *
 * Va aparte de `renderer.ts` porque aquel arrastra Three entero: así se puede
 * preguntar antes de descargarlo, y poner el esqueleto mientras baja.
 */
export function supportsWebGL(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(
            window.WebGLRenderingContext &&
                (canvas.getContext("webgl2") || canvas.getContext("webgl")),
        );
    } catch {
        return false;
    }
}
