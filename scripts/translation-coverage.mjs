// Informe de cobertura de traducción.
//
// No rompe el build: traducir va por detrás de escribir, y eso es normal. Lo
// que no es aceptable es que la deriva sea invisible — de ahí que el build lo
// diga en voz alta cada vez.
//
// Se apoya en los ficheros, no en el estado de render: es determinista y no
// depende de qué páginas se hayan generado.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "es", "gl"];
const DEFAULT_LOCALE = "en";
const I18N_DIR = "src/i18n";
const CONTENT_DIR = "src/content";

/** Colecciones que se traducen. `stack` no: son nombres de tecnologías. */
const LOCALIZED_COLLECTIONS = ["hero", "about", "projects", "experience", "education"];

const report = [];

// --- Claves de interfaz ---
const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
const defaultStrings = readJson(join(I18N_DIR, `${DEFAULT_LOCALE}.json`));
const defaultKeys = Object.keys(defaultStrings);

for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const strings = readJson(join(I18N_DIR, `${locale}.json`));
    const missing = defaultKeys.filter((key) => !(key in strings));
    if (missing.length > 0) {
        report.push({ scope: `strings (${locale})`, missing, total: defaultKeys.length });
    }
}

// --- Entradas de contenido ---
// Convención: `<slug>.<locale>.md`.
for (const collection of LOCALIZED_COLLECTIONS) {
    const dir = join(CONTENT_DIR, collection);
    if (!existsSync(dir)) continue;

    const bySlug = new Map();
    for (const file of readdirSync(dir)) {
        const match = file.match(/^(.+)\.([a-z]{2})\.mdx?$/);
        if (!match) continue;
        const [, slug, locale] = match;
        if (!bySlug.has(slug)) bySlug.set(slug, new Set());
        bySlug.get(slug).add(locale);
    }

    for (const locale of LOCALES) {
        if (locale === DEFAULT_LOCALE) continue;
        const missing = [...bySlug.entries()]
            .filter(([, present]) => !present.has(locale))
            .map(([slug]) => slug);
        if (missing.length > 0) {
            report.push({ scope: `${collection} (${locale})`, missing, total: bySlug.size });
        }
    }
}

// --- Posts: se informan, pero no son deuda ---
// Un post sin traducir simplemente no sale en ese idioma; es la regla, no un
// descuido. Se listan aparte para que se vea el reparto.
const postsDir = join(CONTENT_DIR, "posts");
const postsByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, 0]));
if (existsSync(postsDir)) {
    for (const file of readdirSync(postsDir)) {
        const match = file.match(/^(.+)\.([a-z]{2})\.mdx?$/);
        if (match && match[2] in postsByLocale) postsByLocale[match[2]] += 1;
    }
}

if (report.length === 0) {
    console.log("translation-coverage: traducciones al día.");
} else {
    console.log("\ntranslation-coverage: pendiente de traducir\n");
    for (const { scope, missing, total } of report) {
        console.log(`  ${scope} — faltan ${missing.length} de ${total}`);
        for (const item of missing.slice(0, 10)) console.log(`    · ${item}`);
        if (missing.length > 10) console.log(`    … y ${missing.length - 10} más`);
    }
    console.log("");
}

const postSummary = LOCALES.map((locale) => `${locale}: ${postsByLocale[locale]}`).join(", ");
console.log(`translation-coverage: posts por idioma → ${postSummary}`);
