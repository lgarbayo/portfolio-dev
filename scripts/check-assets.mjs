// Avisos de assets que el sitio espera pero todavía no están.
//
// No rompe el build: el sitio funciona sin ellos —la imagen social cae en el
// genérico, la figura del hero se queda en su render— pero conviene que se vea,
// o se despliega con un hueco y nadie se entera hasta que alguien lo mira.
import { existsSync } from "node:fs";
import { join } from "node:path";

const expected = [
    { path: "cv-en.pdf", why: "el CV en inglés del visor de Contacto" },
    { path: "cv-es.pdf", why: "el CV en castellano del visor de Contacto" },
    { path: "og-image.png", why: "imagen de previsualización al compartir enlaces" },
    { path: "favicon-32.png", why: "el icono de la pestaña" },
    { path: "assets/ui/personaje.webp", why: "el render de la figura del centro de la bienvenida" },
    { path: "assets/ui/personaje.glb", why: "el modelo 3D que sustituye a ese render en escritorio" },
];

const missing = expected.filter(({ path }) => !existsSync(join("public", path)));

if (missing.length === 0) {
    console.log("check-assets: todos los assets esperados están.");
} else {
    console.log("\ncheck-assets: faltan assets (el sitio funciona igual)\n");
    for (const { path, why } of missing) {
        console.log(`  · public/${path} — ${why}`);
    }
    console.log("");
}
