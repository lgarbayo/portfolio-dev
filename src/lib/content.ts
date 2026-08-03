import { getCollection, type CollectionEntry, type CollectionKey } from "astro:content";
import { defaultLocale, type Locale } from "@/i18n/config";

/**
 * Resolución de contenido por idioma.
 *
 * La regla, decidida en el diseño (D5), no es la misma para todo:
 *
 *  - El contenido del portfolio (about, proyectos, experiencia, formación) cae
 *    al idioma por defecto cuando falta la traducción. Una sección en blanco es
 *    peor que una sección en inglés.
 *
 *  - Los posts del blog NO caen. Un artículo a medio traducir es peor que un
 *    artículo ausente, así que sólo aparece en los idiomas en los que existe.
 */

type LocalizedEntry = { data: { locale: Locale; slug: string } };

/** Entradas que faltan por idioma, para el informe de cobertura del build. */
const missingTranslations = new Map<string, Set<string>>();

function recordMissing(collection: string, locale: Locale, slug: string) {
    const key = `${collection}:${locale}`;
    if (!missingTranslations.has(key)) missingTranslations.set(key, new Set());
    missingTranslations.get(key)!.add(slug);
}

export function getMissingTranslations(): Record<string, string[]> {
    return Object.fromEntries(
        [...missingTranslations.entries()].map(([key, slugs]) => [key, [...slugs].sort()]),
    );
}

/**
 * Entradas de una colección en el idioma pedido, cayendo al idioma por defecto
 * cuando falta la traducción.
 *
 * Devuelve además `isFallback` para que la interfaz pueda marcar lo que se está
 * mostrando en otro idioma, en vez de hacerlo pasar por traducido.
 */
export async function getLocalizedEntries<C extends CollectionKey>(
    collection: C,
    locale: Locale,
): Promise<Array<CollectionEntry<C> & { isFallback: boolean }>> {
    const all = (await getCollection(collection)) as Array<CollectionEntry<C> & LocalizedEntry>;

    const bySlug = new Map<string, Map<Locale, (typeof all)[number]>>();
    for (const entry of all) {
        if (!bySlug.has(entry.data.slug)) bySlug.set(entry.data.slug, new Map());
        bySlug.get(entry.data.slug)!.set(entry.data.locale, entry);
    }

    const resolved: Array<CollectionEntry<C> & { isFallback: boolean }> = [];

    for (const [slug, versions] of bySlug) {
        const translated = versions.get(locale);
        if (translated) {
            resolved.push({ ...translated, isFallback: false });
            continue;
        }

        const fallback = versions.get(defaultLocale);
        if (!fallback) continue;

        recordMissing(collection, locale, slug);
        resolved.push({ ...fallback, isFallback: true });
    }

    return resolved;
}

/** Igual que el anterior pero para colecciones de una sola entrada (hero, about). */
export async function getLocalizedEntry<C extends CollectionKey>(
    collection: C,
    locale: Locale,
): Promise<(CollectionEntry<C> & { isFallback: boolean }) | undefined> {
    const entries = await getLocalizedEntries(collection, locale);
    return entries[0];
}

/**
 * Posts visibles en un idioma: los escritos en él, más los del idioma por
 * defecto que todavía no estén traducidos.
 *
 * Antes no había fallback, con el argumento de que un artículo a medio traducir
 * es peor que uno ausente. El argumento sigue siendo bueno para una traducción
 * chapucera, pero el efecto real era otro: como se escribe en inglés, el blog
 * existía sólo en inglés y en los otros dos idiomas no aparecía ni el enlace.
 * Un artículo entero en inglés, marcado como tal, es mejor que un blog que se
 * esconde en dos de los tres idiomas.
 *
 * Cada post conserva su propio `locale`, que es lo que usan la lista y el feed
 * para enlazar a la URL donde ese artículo existe de verdad.
 */
export async function getPublishedPosts(locale: Locale) {
    const posts = await getCollection("posts");
    const published = posts.filter((post) => import.meta.env.DEV || !post.data.draft);

    const translated = new Set(
        published.filter((post) => post.data.locale === locale).map((post) => post.data.slug),
    );

    return published
        .filter(
            (post) =>
                post.data.locale === locale ||
                (post.data.locale === defaultLocale && !translated.has(post.data.slug)),
        )
        .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** ¿Este idioma tiene algo que enseñar en el blog? Decide si el enlace aparece. */
export async function hasPublishedPosts(locale: Locale): Promise<boolean> {
    return (await getPublishedPosts(locale)).length > 0;
}

/**
 * Orden de la experiencia: primero lo que sigue en curso, y lo cerrado detrás.
 *
 * Sin esto mandaba sólo la fecha de inicio, y un trabajo terminado hace meses
 * podía colarse por delante de algo que todavía se está haciendo. Dentro de cada
 * grupo se ordena por lo más reciente: por fecha de inicio lo que sigue abierto,
 * y por fecha de fin lo cerrado — de dos trabajos acabados, el que terminó
 * después es el que cuenta primero, aunque empezara más tarde.
 *
 * Lo usan la sección de la web y el panel del juego: la misma información en dos
 * órdenes distintos se lee como un fallo.
 */
type Dated = { data: { startDate?: Date; endDate?: Date; order: number } };

export function byCurrentThenRecent(a: Dated, b: Dated): number {
    // El `order` manda sobre las fechas: lo que se coloca a mano se coloca.
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;

    // Sin fecha de inicio no hay cronología que respetar: esas van detrás de las
    // fechadas de su mismo grupo.
    if (!a.data.startDate || !b.data.startDate) {
        return Number(!a.data.startDate) - Number(!b.data.startDate);
    }

    const aOpen = a.data.endDate === undefined;
    const bOpen = b.data.endDate === undefined;
    if (aOpen !== bOpen) return aOpen ? -1 : 1;

    if (!aOpen && !bOpen) {
        const byEnd = b.data.endDate!.getTime() - a.data.endDate!.getTime();
        if (byEnd !== 0) return byEnd;
    }

    return b.data.startDate.getTime() - a.data.startDate.getTime();
}
