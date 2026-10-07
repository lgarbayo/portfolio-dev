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
    { path: "assets/ui/hero-figure.webp", why: "el fotograma de la figura del centro de la bienvenida" },
    { path: "assets/ui/hero-figure.mp4", why: "el vídeo que sustituye a ese fotograma en escritorio" },
    { path: "assets/ui/hero-figure-dark.mp4", why: "el giro del robot con fondo oscuro" },
    { path: "assets/ui/hero-figure-dark.webp", why: "el frontal del hero en modo oscuro" },
    { path: "assets/ui/hero-figure-narrow-dark.webp", why: "el frontal oscuro para pantalla estrecha" },
    { path: "assets/ui/hero-figure-narrow.webp", why: "el mismo fotograma recortado, que es lo único que se pide en estrecho" },
    { path: "assets/ui/links-qr.svg", why: "el QR de la cabecera; se genera con scripts/make-links-qr.mjs" },
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
