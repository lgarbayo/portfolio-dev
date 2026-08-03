import en from "./en.json";
import es from "./es.json";
import gl from "./gl.json";
import { defaultLocale, type Locale } from "./config";

export * from "./config";

/** Las claves válidas son las del idioma por defecto: es el contrato. */
export type StringKey = keyof typeof en;

const dictionaries: Record<Locale, Partial<Record<StringKey, string>>> = {
    en,
    es: es as Partial<Record<StringKey, string>>,
    gl: gl as Partial<Record<StringKey, string>>,
};

/** Claves que faltan por idioma, para el informe de cobertura del build. */
const missingKeys = new Map<Locale, Set<string>>();

export function getMissingStringKeys(): Record<string, string[]> {
    return Object.fromEntries(
        [...missingKeys.entries()].map(([locale, keys]) => [locale, [...keys].sort()]),
    );
}

function recordMissing(locale: Locale, key: string) {
    if (!missingKeys.has(locale)) missingKeys.set(locale, new Set());
    missingKeys.get(locale)!.add(key);
}

/**
 * Devuelve el traductor de un idioma.
 *
 * Si falta una clave se cae al idioma por defecto y se anota — nunca se
 * devuelve vacío ni el nombre crudo de la clave, que es lo que acaba
 * apareciendo en producción cuando el fallback no está pensado.
 *
 * Acepta interpolación simple: t("experience.logoAlt", { organization: "X" }).
 */
export function useTranslations(locale: Locale) {
    return function t(key: StringKey, values?: Record<string, string | number>): string {
        let value = dictionaries[locale]?.[key];

        if (value === undefined) {
            if (locale !== defaultLocale) recordMissing(locale, key);
            value = dictionaries[defaultLocale][key];
        }

        if (value === undefined) {
            // Ni siquiera en el idioma por defecto: eso es un bug de código, no
            // una traducción pendiente.
            throw new Error(`Missing translation key "${key}" in the default locale.`);
        }

        if (!values) return value;

        return value.replace(/\{(\w+)\}/g, (match, name: string) =>
            name in values ? String(values[name]) : match,
        );
    };
}
