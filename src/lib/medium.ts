import snapshot from "../data/medium-feed.xml?raw";

/**
 * Los artículos que publico en Medium, para listarlos junto a los del blog.
 *
 * Medium no tiene API pública, pero sí un feed RSS por autor. Se lee al
 * construir la web: así un artículo nuevo sale en el siguiente build sin tocar
 * nada. Si Medium no contesta —sin red, o bloqueando al servidor de build—, se
 * usa la copia guardada en `src/data/medium-feed.xml`, que se refresca con
 * `npm run medium:sync`. Lo que salga de las dos se junta, para que un fallo de
 * red nunca haga desaparecer un artículo que ya estaba.
 */

export const MEDIUM_PROFILE = "https://medium.com/@lugarbayo";
const FEED = "https://medium.com/feed/@lugarbayo";

export interface MediumPost {
    title: string;
    /** Sin el `?source=rss…` que añade el feed. */
    url: string;
    pubDate: Date;
    /** El subtítulo del artículo: el primer párrafo, que Medium pone en cursiva. */
    description: string;
    tags: string[];
    /** Escribo en Medium en inglés. */
    lang: "en";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };

function decode(text: string): string {
    return text.replace(/&(#?\w+);/g, (match, name: string) => {
        if (name in ENTITIES) return ENTITIES[name]!;
        if (name.startsWith("#x")) return String.fromCodePoint(parseInt(name.slice(2), 16));
        if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)));
        return match;
    });
}

/** El contenido de una etiqueta, con o sin CDATA. */
function field(item: string, tag: string): string {
    const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    const raw = match?.[1] ?? "";
    const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
    return cdata ? cdata[1]! : decode(raw);
}

function plain(html: string): string {
    return decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

export function parseMediumFeed(xml: string): MediumPost[] {
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, item]) => {
        const title = plain(field(item!, "title"));
        const link = field(item!, "link").trim();
        const pubDate = new Date(field(item!, "pubDate"));
        if (!title || !link || Number.isNaN(pubDate.getTime())) return [];
        const url = new URL(link);
        url.search = "";
        const firstParagraph = field(item!, "content:encoded").match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
        const tags = [...item!.matchAll(/<category>([\s\S]*?)<\/category>/g)].map(([, tag]) =>
            plain(tag!.replace(/^<!\[CDATA\[|\]\]>$/g, "")),
        );
        return [{ title, url: url.toString(), pubDate, description: plain(firstParagraph), tags, lang: "en" as const }];
    });
}

async function fetchLive(): Promise<MediumPost[]> {
    try {
        const response = await fetch(FEED, { signal: AbortSignal.timeout(6000) });
        if (!response.ok) return [];
        return parseMediumFeed(await response.text());
    } catch {
        return [];
    }
}

let cached: Promise<MediumPost[]> | null = null;

/** Los artículos de Medium, del más reciente al más antiguo. Una vez por build. */
export function getMediumPosts(): Promise<MediumPost[]> {
    cached ??= fetchLive().then((live) => {
        const byUrl = new Map<string, MediumPost>();
        for (const post of [...parseMediumFeed(snapshot), ...live]) byUrl.set(post.url, post);
        return [...byUrl.values()].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    });
    return cached;
}
