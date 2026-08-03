// El portfolio web se carga sin motores: Phaser entra al pulsar el launcher y
// Three al entrar en viewport la sección que lo necesita. Si alguno se cuela en
// el arranque de una página por un import estático despistado, la migración
// pierde justo lo que vino a ganar — así que el build falla aquí en vez de en
// producción.
//
// Qué chunk es "pesado" lo decide `heavy-chunks-plugin.mjs` preguntando al grafo
// de módulos de Vite. Buscar nombres de paquete en el JS minificado no vale: se
// probó, y daba verde con Phaser dentro.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const MANIFEST = join(DIST, ".heavy-chunks.json");

if (!existsSync(DIST)) {
    console.log("bundle-budget: no hay build que revisar.");
    process.exit(0);
}

if (!existsSync(MANIFEST)) {
    console.log("bundle-budget: ningún chunk contiene motores pesados.");
    process.exit(0);
}

const heavyChunks = JSON.parse(readFileSync(MANIFEST, "utf8"));

const htmlFiles = [];
const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".html")) htmlFiles.push(full);
    }
};
walk(DIST);

// Un chunk sólo es un problema si el HTML lo pide de entrada (`src=` o
// `modulepreload`). Si únicamente aparece como destino de un import dinámico
// dentro de otro chunk, está haciendo exactamente lo que debe.
const violations = [];
for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const chunk of heavyChunks) {
        const eager =
            html.includes(`src="/_astro/${chunk}"`) ||
            html.includes(`href="/_astro/${chunk}"`);
        if (eager) violations.push({ file, chunk });
    }
}

if (violations.length > 0) {
    console.error("\nbundle-budget: motores pesados en el arranque de una página.\n");
    for (const { file, chunk } of violations) {
        console.error(`  ✗ ${file} carga ${chunk} de entrada`);
    }
    console.error("\nCárgalo con await import() dentro del handler o de la isla que lo usa.\n");
    process.exit(1);
}

console.log(
    `bundle-budget: ${htmlFiles.length} páginas revisadas, ${heavyChunks.length} chunk(s) pesado(s) sólo bajo demanda.`,
);
