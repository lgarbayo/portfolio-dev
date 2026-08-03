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
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MODULE_ID = "virtual:keycap-icons";
const RESOLVED_ID = `\0${MODULE_ID}`;

const STACK_DIR = "src/content/stack";

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
                const icon = simpleIcons[exportName(slug)];
                if (!icon) {
                    // Parar el build es el fallo barato. El caro es una tecla en
                    // blanco en producción, que no se ve hasta que alguien mira.
                    throw new Error(
                        `Icono desconocido en el stack: "${slug}". Mira el slug en https://simpleicons.org, o quita el campo \`icon\` para que la tecla se quede con su texto.`,
                    );
                }

                icons[slug] = { path: icon.path, color: `#${icon.hex}`, title: icon.title };
            }

            return `export const KEYCAP_ICONS = ${JSON.stringify(icons)};\n`;
        },
    };
}
