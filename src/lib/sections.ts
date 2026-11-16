import type { StringKey } from "@/i18n/index";

/**
 * Las secciones de la home, en orden. Una sola lista para el menú, el contador
 * de la barra de abajo y los atajos numéricos: si cada uno llevase la suya, el
 * «03 / 07» de abajo y el «03» del menú acabarían señalando cosas distintas.
 *
 * Experiencia y Formación no están: viven dentro de «Sobre mí», como paneles,
 * y conservan su `id` para que los enlaces antiguos sigan llegando.
 */
export interface HomeSection {
    id: string;
    label: StringKey;
}

export function homeSections(showBlog: boolean): HomeSection[] {
    return [
        { id: "hero", label: "nav.home" },
        { id: "about", label: "nav.about" },
        { id: "projects", label: "nav.projects" },
        { id: "stack", label: "nav.stack" },
        { id: "press", label: "nav.press" },
        ...(showBlog ? [{ id: "blog", label: "nav.blog" } as const] : []),
        { id: "contact", label: "nav.contact" },
    ];
}

/** «03» para Proyectos: el número con el que sale en el menú y en la barra. */
export function sectionNumber(id: string, showBlog = true): string {
    const index = homeSections(showBlog).findIndex((section) => section.id === id);
    return String(index + 1).padStart(2, "0");
}
