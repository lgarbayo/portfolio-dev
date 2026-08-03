// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { heavyChunksPlugin } from "./scripts/heavy-chunks-plugin.mjs";
import { keycapIconsPlugin } from "./scripts/keycap-icons-plugin.mjs";

// El `site` alimenta canonical, hreflang, sitemap y las URLs absolutas de Open
// Graph. Sin él Astro emite hosts equivocados en silencio.
export default defineConfig({
    site: "https://lgarbayo.dev",

    // La barra flotante de Astro sólo existe en `astro dev` —nunca sale en el
    // build—, pero se planta encima de la esquina inferior y estorba para ver
    // la página mientras se trabaja.
    devToolbar: { enabled: false },

    i18n: {
        locales: ["en", "es"],
        defaultLocale: "en",
        routing: {
            // Ambos idiomas llevan prefijo: `/` queda como redirect que resuelve
            // idioma, y así no hay dos URLs para la misma página en inglés.
            prefixDefaultLocale: true,
            redirectToDefaultLocale: false,
        },
    },

    integrations: [
        mdx(),
        sitemap({
            // `/` sólo redirige y `/404` no es contenido: ninguna de las dos es
            // una página que deba indexarse.
            filter: (page) => {
                const path = new URL(page).pathname;
                return path !== "/" && !path.startsWith("/404");
            },
            i18n: {
                defaultLocale: "en",
                locales: { en: "en-US", es: "es-ES" },
            },
        }),
    ],

    vite: {
        // Anota qué chunks llevan Phaser o Three dentro; el build falla después
        // si alguna página los pide de entrada (ver assert-bundle-budget.mjs).
        // El segundo sirve los logos de las teclas dentro del chunk del teclado
        // en vez de en el HTML, que son 10 KB gzip por visita de diferencia.
        plugins: [heavyChunksPlugin(), keycapIconsPlugin()],
    },

    build: {
        inlineStylesheets: "auto",
    },
});
