/**
 * Marca qué chunks contienen los motores pesados.
 *
 * Se hace desde un plugin de Vite y no leyendo el JS generado porque, después de
 * minificar, en el bundle no queda ninguna cadena fiable que buscar: el primer
 * intento con expresiones regulares daba verde con Phaser dentro. Aquí se
 * pregunta al grafo de módulos, que sabe la verdad.
 *
 * El resultado se escribe en `dist/.heavy-chunks.json` y lo consume
 * `assert-bundle-budget.mjs`, que comprueba que ningún HTML los pida de entrada.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const HEAVY_PACKAGES = ["phaser", "three"];

export function heavyChunksPlugin({ outDir = "dist" } = {}) {
    const heavy = new Set();

    return {
        name: "heavy-chunks",
        apply: "build",

        generateBundle(_options, bundle) {
            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (chunk.type !== "chunk") continue;

                const containsHeavy = chunk.moduleIds?.some((id) =>
                    HEAVY_PACKAGES.some(
                        (pkg) => id.includes(`node_modules/${pkg}/`) || id.includes(`node_modules\\${pkg}\\`),
                    ),
                );

                if (containsHeavy) heavy.add(fileName.split("/").pop());
            }
        },

        closeBundle() {
            if (heavy.size === 0) return;
            const target = join(outDir, ".heavy-chunks.json");
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, JSON.stringify([...heavy].sort(), null, 2));
        },
    };
}
