import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts } from "@/lib/content";
import { locales, localizedPath, useTranslations, type Locale } from "@/i18n/index";

export function getStaticPaths() {
    return locales.map((locale) => ({ params: { locale } }));
}

/**
 * Un feed por idioma. `getPublishedPosts` ya excluye borradores y resuelve el
 * idioma —con caída al inglés—, así que el feed hereda las dos reglas sin
 * repetirlas aquí. El enlace apunta a la URL del artículo, que puede estar en
 * otro idioma que el del feed.
 */
export async function GET(context: APIContext) {
    const locale = context.params.locale as Locale;
    const t = useTranslations(locale);
    const posts = await getPublishedPosts(locale);

    return rss({
        title: `${t("blog.title")} — ${t("site.title")}`,
        description: t("blog.description"),
        site: context.site!,
        items: posts.map((post) => ({
            title: post.data.title,
            description: post.data.description,
            pubDate: post.data.pubDate,
            link: localizedPath(post.data.locale, `blog/${post.data.slug}`),
            categories: post.data.tags,
        })),
        customData: `<language>${locale}</language>`,
    });
}
