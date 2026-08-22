// Genera el QR que lleva a la página de enlaces.
//
//   node scripts/make-links-qr.mjs
//
// El SVG se guarda y se versiona en vez de calcularse en cada build. Codifica
// una URL que no cambia, así que generarlo una vez deja el fichero a la vista:
// si algún día se mueve el dominio o la ruta, se vuelve a lanzar esto y el diff
// enseña qué cambió. `qrcode` es dependencia de desarrollo por lo mismo — nunca
// llega al navegador, sólo hace falta aquí.
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";

const TARGET = "https://lgarbayo.com/links/";
const OUT = "public/assets/ui/links-qr.svg";

// Corrección de errores M: aguanta un 15% del código tapado —de sobra para una
// pantalla, que no se ensucia— y deja menos módulos que H, más grandes y más
// fáciles de leer de lejos, que es como se escanea esto.
const svg = await QRCode.toString(TARGET, {
    type: "svg",
    errorCorrectionLevel: "M",
    // Margen 4: es la zona de silencio que pide la norma. Con menos, un lector
    // puede confundir el borde del código con datos, y el sitio es oscuro —el
    // blanco de alrededor es lo único que separa el QR del panel.
    margin: 4,
    color: { dark: "#171717", light: "#ffffff" },
});

// Fuera la declaración XML y el DOCTYPE: no hacen falta dentro de un `<img>` y
// estorban al leer el diff. Entra un `role` con la URL para cuando el SVG se
// abre suelto o lo lee un lector de pantalla.
const clean = svg
    .replace(/<\?xml[^>]*\?>/, "")
    .replace(/<!DOCTYPE[^>]*>/, "")
    .replace("<svg ", `<svg role="img" aria-label="${TARGET}" `)
    .trim();

writeFileSync(OUT, clean + "\n");
console.log(`make-links-qr: ${OUT} → ${TARGET}`);
