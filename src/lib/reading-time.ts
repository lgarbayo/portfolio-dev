/**
 * Minutos de lectura de un artículo.
 *
 * Se calcula en el build a partir del markdown en crudo, no del HTML: el HTML
 * ya trae dentro el marcado de las figuras, y contar eso daría un número que
 * crece con las imágenes en vez de con el texto.
 *
 * Lo que se descuenta antes de contar palabras:
 *
 *  - Las etiquetas HTML enteras, con sus atributos. Ahí viven los `alt`, que
 *    pueden ser tres líneas de descripción que nadie lee en voz alta. El texto
 *    que va *entre* etiquetas sí cuenta: un `<figcaption>` se lee.
 *  - Los bloques de código. No se leen a velocidad de prosa, así que meterlos
 *    en la media estropea las dos cifras.
 *  - Las URL de los enlaces, dejando el texto visible.
 *
 * 200 palabras por minuto es la referencia habitual para lectura en pantalla, y
 * sirve igual para los tres idiomas del sitio: el español y el gallego usan
 * palabras algo más largas que el inglés, pero la diferencia queda muy por
 * debajo del redondeo a minutos.
 */

const WORDS_PER_MINUTE = 200;

export function readingMinutes(markdown: string): number {
    const text = markdown
        // Bloques de código y código en línea.
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        // Enlaces e imágenes: se queda el texto, se va la URL.
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        // Etiquetas HTML con todo lo que llevan dentro de los corchetes.
        .replace(/<[^>]+>/g, " ");

    const words = text.split(/\s+/).filter(Boolean).length;

    // Nunca cero: un artículo de tres frases sigue costando un momento, y "0 min
    // de lectura" se lee como un error de la página, no como un artículo corto.
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
