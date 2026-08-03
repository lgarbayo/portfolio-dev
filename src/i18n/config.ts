/**
 * Configuración de idiomas. Inglés por defecto: el público objetivo es
 * internacional y todo el copy original ya estaba en inglés — el español es la
 * traducción, no al revés.
 */

export const locales = ["en", "es", "gl"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Nombre del idioma en su propio idioma, para el selector. */
export const localeNames: Record<Locale, string> = {
    en: "English",
    es: "Español",
    gl: "Galego",
};

/** Etiqueta corta del selector. */
export const localeLabels: Record<Locale, string> = {
    en: "EN",
    es: "ES",
    gl: "GL",
};

/**
 * Etiqueta BCP-47 de cada idioma, para lo que no es texto nuestro: formateo de
 * fechas y metadatos. Vive aquí para que añadir un idioma sea tocar un fichero
 * y no perseguir seis `locale === "es"` repartidos por los componentes.
 */
export const localeTags: Record<Locale, string> = {
    en: "en-GB",
    es: "es-ES",
    gl: "gl-ES",
};

/** El mismo dato en el formato que pide Open Graph. */
export const ogLocales: Record<Locale, string> = {
    en: "en_US",
    es: "es_ES",
    gl: "gl_ES",
};

export function isLocale(value: string | undefined): value is Locale {
    return value !== undefined && (locales as readonly string[]).includes(value);
}

/**
 * Saca el idioma de una URL. Todas las rutas de contenido llevan prefijo, así
 * que el primer segmento manda; si no es un idioma conocido devolvemos el de
 * por defecto (pasa en `/`, que es sólo el redirect).
 */
export function localeFromPath(pathname: string): Locale {
    const segment = pathname.split("/").filter(Boolean)[0];
    return isLocale(segment) ? segment : defaultLocale;
}

/** Los demás idiomas, en el orden declarado. */
export function otherLocales(locale: Locale): Locale[] {
    return locales.filter((code) => code !== locale);
}

/**
 * Traduce una ruta a otro idioma conservando la página.
 * `/en/blog/foo` + `es` → `/es/blog/foo`
 */
export function translatePath(pathname: string, target: Locale): string {
    const segments = pathname.split("/").filter(Boolean);
    if (isLocale(segments[0])) {
        segments[0] = target;
    } else {
        segments.unshift(target);
    }
    const path = `/${segments.join("/")}`;
    // Conservamos la barra final para que no haya dos URLs por página.
    return pathname.endsWith("/") && !path.endsWith("/") ? `${path}/` : path;
}

/** Construye una ruta con prefijo de idioma a partir de una relativa. */
export function localizedPath(locale: Locale, path = ""): string {
    const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
    return clean ? `/${locale}/${clean}/` : `/${locale}/`;
}
