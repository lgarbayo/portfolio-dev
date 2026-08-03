import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { locales } from "./i18n/config";

/**
 * Modelo de contenido.
 *
 * Todo el contenido del portfolio vive aquí, no en el marcado: añadir un
 * proyecto es crear un fichero, no tocar un componente. Los esquemas se validan
 * en build, así que un `repoUrl` mal escrito o una fecha inválida rompen el
 * build en vez de aparecer roto en producción.
 *
 * Convención de idioma: los ficheros se nombran `<slug>.<locale>.md`. El
 * `slug` compartido es lo que empareja las dos versiones de una misma entrada.
 */

const localeField = z.enum(locales);

/**
 * Loader para colecciones traducidas.
 *
 * Los ficheros se llaman `<slug>.<locale>.md`, pero Astro deriva el id quitando
 * sólo la última extensión: `meigasearch.en.md` y `meigasearch.es.md` acabarían
 * los dos como `meigasearch`, y el segundo machacaría al primero. El resultado
 * es que media web se queda sin contenido — así que el id lleva el idioma
 * dentro.
 */
const localizedGlob = (folder: string) =>
    glob({
        base: `./src/content/${folder}`,
        pattern: "**/*.{md,mdx}",
        generateId: ({ entry }) => entry.replace(/\.mdx?$/, ""),
    });

/** Campos que comparte todo lo que existe en dos idiomas. */
const localized = {
    locale: localeField,
    slug: z.string(),
};

const about = defineCollection({
    loader: localizedGlob("about"),
    schema: z.object({
        ...localized,
        title: z.string(),
        /** Bloques narrativos, cada uno con su subtítulo. */
        blocks: z
            .array(
                z.object({
                    title: z.string(),
                    body: z.string(),
                }),
            )
            .min(1),
        profileImage: z.string().default("/assets/ui/me.jpg"),
        profileImageAlt: z.string(),
    }),
});

const hero = defineCollection({
    loader: localizedGlob("hero"),
    schema: z.object({
        ...localized,
        greeting: z.string(),
        /* El puesto no está aquí a propósito: la bienvenida ya no lo enseña y el
           único sitio que lo usa —el JSON-LD de PersonSchema— lo lee de i18n, no
           de esta colección. */
        statement: z.string(),
    }),
});

const projects = defineCollection({
    loader: localizedGlob("projects"),
    schema: z.object({
        ...localized,
        title: z.string(),
        description: z.string(),
        category: z.enum(["hackathon", "data", "backend", "web"]),
        tags: z.array(z.string()).min(1),
        highlights: z.array(z.string()).default([]),
        repoUrl: z.url().optional(),
        demoUrl: z.url().optional(),
        devpostUrl: z.url().optional(),
        year: z.number().int().optional(),
        role: z.string().optional(),
        /** Marco en el que se construyó: "HackUDC 2026", "Proyecto personal"… */
        context: z.string().optional(),
        /** Resultado concreto, en una frase. */
        impact: z.string().optional(),
        thumbnail: z.string().optional(),
        thumbnailAlt: z.string().optional(),
        featured: z.boolean().default(false),
    })
        // Cada proyecto tiene que llevar a algún sitio: una tarjeta sin enlace es
        // una afirmación sin manera de comprobarla.
        .refine((entry) => entry.repoUrl || entry.demoUrl || entry.devpostUrl, {
            message: "Un proyecto necesita al menos un enlace (repoUrl, demoUrl o devpostUrl).",
        })
        .refine((entry) => !entry.thumbnail || entry.thumbnailAlt, {
            message: "Una miniatura necesita thumbnailAlt.",
        }),
});

const experience = defineCollection({
    loader: localizedGlob("experience"),
    schema: z.object({
        ...localized,
        role: z.string(),
        organization: z.string(),
        /**
         * Opcional: hay entradas sin periodo —un voluntariado que se cuenta por
         * lo que es, no por cuándo fue—. Sin fecha no se pinta la línea del
         * periodo en vez de inventarse una.
         */
        startDate: z.coerce.date().optional(),
        /** Sin fecha de fin = en curso. */
        endDate: z.coerce.date().optional(),
        /**
         * Escotilla para sacar una entrada de la cronología. Por defecto 0, y
         * cuanto más alto, más abajo: es lo que permite dejar el voluntariado al
         * final sin tener que falsear fechas para conseguirlo.
         */
        order: z.number().int().default(0),
        responsibilities: z.array(z.string()).min(1),
        logo: z.string().optional(),
        stack: z.array(z.string()).default([]),
        url: z.url().optional(),
    }),
});

const education = defineCollection({
    loader: localizedGlob("education"),
    schema: z.object({
        ...localized,
        title: z.string(),
        institution: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        type: z.enum(["degree", "scholarship", "certification", "program"]),
        /**
         * Escotilla para salirse del orden por fecha: menor sube, mayor baja, y
         * el resto se queda en 0 ordenándose por fecha. Lo usa la titulación en
         * curso, que encabeza la sección aunque no sea lo más reciente.
         */
        order: z.number().int().default(0),
        /** Párrafos, no un texto suelto: hay entradas que necesitan contar más. */
        description: z.array(z.string()).default([]),
        url: z.url().optional(),
        /** Repositorio del trabajo hecho durante el programa, si lo hay. */
        repoUrl: z.url().optional(),
        /** Fotos que acompañan a la descripción. El alt es obligatorio. */
        images: z
            .array(z.object({ src: z.string(), alt: z.string() }))
            .default([]),
    }),
});

/**
 * El stack no se localiza: los nombres de las tecnologías son los mismos en
 * ambos idiomas. Lo que sí se traduce son los nombres de las categorías, que
 * viven en los ficheros de strings.
 */
const stack = defineCollection({
    loader: glob({ base: "./src/content/stack", pattern: "**/*.md" }),
    schema: z.object({
        name: z.string(),
        category: z.enum(["languages", "backend", "frontend", "data", "devops"]),
        logo: z.string().optional(),
        /** Texto de la tecla en la escena 3D; sin él va sólo a la lista. */
        keycap: z.string().optional(),
        /**
         * Slug de Simple Icons para el logo de la tecla. Es opcional a
         * propósito: no toda tecnología tiene marca con icono —RAG/LLM APIs no
         * es una marca, y Phaser no está en el catálogo—, y esas se quedan con
         * el texto del `keycap`. Un slug inventado rompe el build, que es lo que
         * queremos: mejor eso que una tecla en blanco en producción.
         */
        icon: z.string().optional(),
        /** Tecla física que la activa en la escena. */
        key: z.string().length(1).optional(),
        order: z.number().int().default(0),
    }),
});

/**
 * Idiomas: una sola entrada por idioma de la web con la lista dentro, en vez de
 * un fichero por idioma hablado. Son tres líneas que se leen juntas y que se
 * traducen juntas; partirlas en nueve ficheros sería papeleo sin ganancia.
 */
/**
 * Actividades: lo que se hizo al margen del código —una revista de facultad, la
 * radio del colegio, competiciones de bachillerato—. No son proyectos y no
 * caben en esa colección: no tienen repositorio, ni stack, ni enlace que
 * enseñar, y meterlas ahí obligaría a inventarles los tres.
 */
const activities = defineCollection({
    loader: localizedGlob("activities"),
    schema: z.object({
        ...localized,
        title: z.string(),
        /** Dónde y con quién: la facultad, el colegio, el equipo. */
        context: z.string().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        description: z.string().optional(),
        /** Lo que se ganó, si se ganó algo. */
        award: z.string().optional(),
    }),
});

const languages = defineCollection({
    loader: localizedGlob("languages"),
    schema: z.object({
        ...localized,
        items: z
            .array(
                z.object({
                    name: z.string(),
                    level: z.string(),
                    /** Título que lo acredita, si lo hay. */
                    credential: z.string().optional(),
                }),
            )
            .min(1),
    }),
});

const posts = defineCollection({
    loader: localizedGlob("posts"),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        /** Los posts son inglés salvo que digan lo contrario. */
        locale: localeField.default("en"),
        slug: z.string(),
        cover: z.string().optional(),
        coverAlt: z.string().optional(),
        /** Para artículos republicados: canonical apuntando al original. */
        canonicalUrl: z.url().optional(),
    }).refine((entry) => !entry.cover || entry.coverAlt, {
        message: "Una portada necesita coverAlt.",
    }),
});

export const collections = {
    about,
    hero,
    projects,
    experience,
    education,
    activities,
    languages,
    stack,
    posts,
};
