/**
 * Guarda una copia del feed de Medium en `src/data/medium-feed.xml`.
 *
 * El build ya lee el feed en directo (`src/lib/medium.ts`); esta copia es lo que
 * usa cuando Medium no contesta. Conviene pasarlo tras publicar un artículo:
 *
 *     npm run medium:sync
 */
import { writeFile } from "node:fs/promises";

const FEED = "https://medium.com/feed/@lugarbayo";
const OUT = new URL("../src/data/medium-feed.xml", import.meta.url);

const response = await fetch(FEED, { signal: AbortSignal.timeout(15000) });
if (!response.ok) {
    console.error(`medium-sync: Medium contestó ${response.status}; la copia no se toca.`);
    process.exit(1);
}
const xml = await response.text();
if (!xml.includes("<item>")) {
    console.error("medium-sync: el feed no trae artículos; la copia no se toca.");
    process.exit(1);
}
await writeFile(OUT, xml);
console.log(`medium-sync: ${xml.split("<item>").length - 1} artículo(s) guardado(s).`);
