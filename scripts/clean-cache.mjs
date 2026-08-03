// Borra la caché de content collections antes de arrancar.
//
// Existe por un fallo real: los ficheros `<slug>.<locale>.md` generaban ids
// duplicados en el loader, eso dejó el almacén de contenido a medias, y el
// resultado eran secciones y modales vacíos que parecían un bug de código. El id
// ya lleva el idioma dentro, pero un almacén envenenado de antes sobrevive a la
// corrección —y sobrevive a reinstalar dependencias—, así que se limpia siempre.
//
// En dev sólo se toca `.astro`: borrar `dist` ahí no aporta nada.
import { rmSync } from "node:fs";

const devOnly = process.argv.includes("--dev");
const targets = devOnly ? [".astro"] : [".astro", "dist"];

for (const dir of targets) {
    rmSync(dir, { recursive: true, force: true });
}

console.log(`clean-cache: ${targets.join(" y ")} borrado${targets.length > 1 ? "s" : ""}.`);
