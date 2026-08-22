import type { StringKey } from "@/i18n/index";

/**
 * Los sitios donde se me encuentra, en un solo lugar.
 *
 * Los usan la sección de Contacto y la página de enlaces del QR. Estaban
 * escritos a mano en la sección, y con dos consumidores eso son dos listas que
 * se separan en cuanto una cambia: el QR lleva a una página que promete ser la
 * lista de mis enlaces, así que tiene que ser la misma lista.
 *
 * `label` es la clave de la frase larga —"Escríbeme un correo"— que va al
 * `aria-label`; `name` es el nombre de la plataforma, que no se traduce.
 */
export interface Channel {
    href: string;
    /** Clave de la etiqueta accesible, que sí depende del idioma. */
    label: StringKey;
    icon: string;
    name: string;
}

export const channels: readonly Channel[] = [
    {
        href: "mailto:lugarbayo@gmail.com",
        label: "contact.email",
        icon: "/assets/ui/mail-svgrepo-com.svg",
        name: "Email",
    },
    {
        href: "https://linkedin.com/in/luis-garbayo",
        label: "contact.linkedin",
        icon: "/assets/ui/linkedin-svgrepo-com.svg",
        name: "LinkedIn",
    },
    {
        href: "https://github.com/lgarbayo",
        label: "contact.github",
        icon: "/assets/ui/github-mark-white.svg",
        name: "GitHub",
    },
    {
        href: "https://devpost.com/lgarbayo",
        label: "contact.devpost",
        icon: "/assets/ui/devpost-svgrepo-com.svg",
        name: "Devpost",
    },
];

/** Los enlaces externos se abren fuera; `mailto:` no. */
export function isExternal(href: string): boolean {
    return href.startsWith("http");
}
