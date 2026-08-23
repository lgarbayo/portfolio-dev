// Trae las fuentes desde Google y las deja servidas por el propio sitio.
//
//   node scripts/fetch-fonts.mjs
//
// Antes se enlazaba la hoja de estilos de `fonts.googleapis.com` desde el
// `<head>`. Eso cuesta dos conexiones a dominios ajenos —una al CSS y otra al
// fichero de la fuente, que sólo se descubre después de leerlo— antes de poder
// pintar una sola letra. Sirviéndolas desde aquí, el CSS entra con el resto del
// bundle y la fuente sale del mismo origen que ya está abierto.
//
// Se genera con esto y se versiona; no hace falta para construir la web. Al
// volver a lanzarlo se ve en el diff si Google ha cambiado los ficheros.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API =
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
// Sin un agente moderno, Google devuelve `ttf` en vez de `woff2`.
const UA =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// El sitio se escribe en castellano, inglés y gallego: `latin` cubre las tildes
// y la eñe, y `latin-ext` queda para nombres propios de fuera. Los subconjuntos
// cirílico, griego y vietnamita no los va a pedir nadie aquí.
const SUBSETS = new Set(["latin", "latin-ext"]);

const OUT_DIR = "public/fonts";
const CSS_OUT = "src/styles/fonts.css";

const css = await (await fetch(API, { headers: { "User-Agent": UA } })).text();
const blocks = [...css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face \{.*?\})/gs)];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const files = new Map();
const faces = [];

for (const [, subset, block] of blocks) {
    if (!SUBSETS.has(subset)) continue;
    const family = /font-family: '([^']+)'/.exec(block)[1];
    const url = /url\(([^)]+)\)/.exec(block)[1];
    const range = /unicode-range: ([^;]+);/.exec(block)[1];

    const name = `${slug(family)}-${subset}.woff2`;
    files.set(url, name);
    // Las dos familias son fuentes variables: un mismo fichero sirve todos los
    // pesos, así que se declara el rango entero una vez en vez de repetir la
    // misma descarga por cada peso.
    if (!faces.some((f) => f.family === family && f.subset === subset)) {
        faces.push({ family, subset, name, range });
    }
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [url, name] of files) {
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(join(OUT_DIR, name), bytes);
    console.log(`  ${name}  ${(bytes.length / 1024).toFixed(1)} KB`);
}

const WEIGHTS = { "Space Grotesk": "400 700", "JetBrains Mono": "400 500" };
const rules = faces
    .map(
        ({ family, name, range }) => `@font-face {
    font-family: "${family}";
    font-style: normal;
    /* Rango, no un peso suelto: son fuentes variables. */
    font-weight: ${WEIGHTS[family]};
    /* El texto se pinta con la fuente de reserva y se cambia al llegar la
       buena, en vez de dejar el hueco en blanco mientras carga. */
    font-display: swap;
    src: url("/fonts/${name}") format("woff2");
    unicode-range: ${range};
}`,
    )
    .join("\n\n");

writeFileSync(
    CSS_OUT,
    `/* Generado por scripts/fetch-fonts.mjs — no editar a mano. */\n\n${rules}\n`,
);
console.log(`\n${CSS_OUT}: ${faces.length} @font-face`);
