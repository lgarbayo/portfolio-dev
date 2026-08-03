import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Comprobación en build de que un asset estático existe de verdad.
 *
 * Sólo corre al generar la página, nunca en el navegador. Lo que resuelve es
 * que una imagen o un modelo que todavía no está no deje un hueco roto: quien
 * lo pinta pregunta antes y decide qué enseñar mientras tanto.
 */

export function publicAssetExists(path: string): boolean {
    return existsSync(join(process.cwd(), "public", path.replace(/^\//, "")));
}
