/**
 * Sirve los logos de las teclas como módulo virtual: `virtual:keycap-icons`.
 *
 * El porqué es de peso, literalmente. Los iconos son rutas SVG largas, y las
 * quince del teclado ocupan unos 21 KB. Serializadas en el HTML de la home
 * —que era lo primero que probé— salían **10 KB gzip** en cada visita, casi el
 * doble de la página, y para una escena que no se monta en móvil, ni con
 * movimiento reducido, ni hasta que la sección entra en pantalla.
 *
 * Como módulo virtual las rutas viajan dentro del chunk del teclado, que es
 * perezoso: quien no llega a ver la escena no descarga ni un byte de esto.
 *
 * La lista no se escribe a mano: sale del `icon:` de los ficheros de
 * `src/content/stack`. Añadir una tecla con logo es tocar su markdown y nada
 * más.
 *
 * El grueso de los logos sale de `simple-icons`. Los que esa librería no
 * distribuye —el de Java, por ejemplo, que Oracle no licencia libremente— se
 * guardan como SVG en `src/assets/keycap-icons` y ganan al paquete.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MODULE_ID = "virtual:keycap-icons";
const RESOLVED_ID = `\0${MODULE_ID}`;

const STACK_DIR = "src/content/stack";
const LOCAL_DIR = "src/assets/keycap-icons";

/** Los slugs `icon:` declarados en el contenido del stack. */
function declaredSlugs() {
    const slugs = new Set();

    for (const file of readdirSync(STACK_DIR)) {
        if (!file.endsWith(".md")) continue;
        const source = readFileSync(join(STACK_DIR, file), "utf8");
        const match = source.match(/^icon:\s*"([^"]+)"\s*$/m);
        if (match) slugs.add(match[1]);
    }

    return [...slugs].sort();
}

/** El nombre del export de cada icono en `simple-icons`: `python` → `siPython`. */
function exportName(slug) {
    return `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

/**
 * Lee un logo de `src/assets/keycap-icons`, si es que ese slug tiene uno.
 *
 * La tecla se pinta de un solo color, así que los trazos del SVG se concatenan
 * en un único `d` y del `fill` sólo interesa el primero, como color de marca
 * del que sale luego el gris.
 */
function localIcon(slug) {
    const file = join(LOCAL_DIR, `${slug}.svg`);
    if (!existsSync(file)) return null;

    const source = readFileSync(file, "utf8");
    const path = [...source.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]).join(" ");
    if (!path) throw new Error(`El logo local "${slug}" no tiene ningún trazo.`);

    return {
        path,
        color: source.match(/\sfill="(#[0-9a-fA-F]+)"/)?.[1] ?? "#000000",
        title: source.match(/<title>([^<]+)<\/title>/)?.[1] ?? slug,
        // Los SVG de marca no vienen todos en la caja de 24 de Simple Icons.
        size: Number(source.match(/viewBox="0 0 (\d+(?:\.\d+)?) /)?.[1] ?? 24),
    };
}

export function keycapIconsPlugin() {
    return {
        name: "keycap-icons",

        resolveId(id) {
            if (id === MODULE_ID) return RESOLVED_ID;
            return null;
        },

        async load(id) {
            if (id !== RESOLVED_ID) return null;

            const simpleIcons = await import("simple-icons");
            const icons = {};

            for (const slug of declaredSlugs()) {
                const local = localIcon(slug);
                if (local) {
                    icons[slug] = local;
                    continue;
                }

                const icon = simpleIcons[exportName(slug)];
                if (!icon) {
                    // Parar el build es el fallo barato. El caro es una tecla en
                    // blanco en producción, que no se ve hasta que alguien mira.
                    throw new Error(
                        `Icono desconocido en el stack: "${slug}". Mira el slug en https://simpleicons.org, deja el SVG en ${LOCAL_DIR}/${slug}.svg, o quita el campo \`icon\` para que la tecla se quede con su texto.`,
                    );
                }

                icons[slug] = {
                    path: icon.path,
                    color: `#${icon.hex}`,
                    title: icon.title,
                    size: 24,
                };
            }

            return `export const KEYCAP_ICONS = ${JSON.stringify(icons)};\n`;
        },
    };
}
