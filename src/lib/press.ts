/** Titulares en su idioma original y enlaces permanentes, sin tracking social. */
export interface PressArticle {
    publisher: string;
    title: string;
    language: "es" | "en";
    published: string;
    url: string;
}

export const pressArticles: readonly PressArticle[] = [
    {
        publisher: "La Región",
        title: "Luis Garbayo Fernández, estudiante de Ingeniería Informática: “La IA ha venido para quedarse, pero habrá cambios en el modelo”",
        language: "es",
        published: "2026-10-05",
        url: "https://www.laregion.es/ourense/luis-garbayo-fernandez-estudiante-ingenieria_1_20261005-4439003.html",
    },
    {
        publisher: "Atlántico",
        title: "La utilidad de la IA: tres jóvenes de Vigo solucionan problemas",
        language: "es",
        published: "2026-09-21",
        url: "https://www.atlantico.net/vigo/utilidad-ia-tres-jovenes-vigo_1_20260921-4420678.html",
    },
    {
        publisher: "La Voz de Galicia",
        title: "Jóvenes becados por un informático vigués de IBM Research apuestan por aplicar la IA a la medicina",
        language: "es",
        published: "2026-09-20",
        url: "https://www.lavozdegalicia.es/noticia/vigo/vigo/2026/09/20/jovenes-becados-ejecutivo-ibm-apuestan-aplicar-ia-medicina/0003_202609V20C4991.htm",
    },
    {
        publisher: "Faro de Vigo",
        // El medio bloquea la lectura automática: título descriptivo, no cita
        // del titular original. La fecha está indicada en la URL del artículo.
        title: "Las becas ANFAIA y el futuro de la inteligencia artificial",
        language: "es",
        published: "2026-09-19",
        url: "https://www.farodevigo.es/gran-vigo/2026/09/19/futuro-ia-inteligencia-artificial-ies-teis-134439362.html",
    },
    {
        publisher: "HISTORA",
        title: "UOS (Unified Oral Scene): Luis Garbayo's Research Project with Fundación ANFAIA and HISTORA",
        language: "en",
        published: "2026-09-01",
        url: "https://www.histora.com/blog/uos-unified-oral-scene-luis-garbayo-anfaia-histora",
    },
];
