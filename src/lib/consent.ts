import { GA_ID, track } from "./analytics";

/**
 * Consentimiento de analítica.
 *
 * El sitio se sirve desde España, así que las cookies de medición necesitan un
 * sí explícito. Lo que se implementa es el modo de consentimiento de Google:
 * gtag se carga siempre —en `Analytics.astro`, con todo denegado por defecto— y
 * lo que cambia es si puede escribir en el almacenamiento. Con el permiso
 * denegado sigue mandando pings sin cookies, que no identifican a nadie y GA
 * usa sólo para estimar totales; con el permiso concedido, la medición es la
 * normal.
 *
 * Lo de publicidad no se pregunta porque no se usa: `ad_storage`,
 * `ad_user_data` y `ad_personalization` se quedan denegados para siempre. Un
 * banner que pide menos es un banner que se lee.
 *
 * La decisión se guarda en `localStorage` y no en una cookie a propósito: una
 * cookie propia para recordar que no quieres cookies es exactamente el chiste
 * que no queremos hacer.
 */

const STORAGE_KEY = "analytics-consent";

export type ConsentDecision = "granted" | "denied";

/** Lo que se decidió, o `null` si aún no se ha preguntado. */
export function readConsent(): ConsentDecision | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "granted" || stored === "denied" ? stored : null;
    } catch {
        // Modo privado o almacenamiento bloqueado: se pregunta cada vez, que es
        // lo conservador. Nunca se da por concedido lo que no se pudo leer.
        return null;
    }
}

function storeConsent(decision: ConsentDecision): void {
    try {
        localStorage.setItem(STORAGE_KEY, decision);
    } catch {
        // Se pierde al recargar; la decisión de esta sesión sí se respeta.
    }
}

export function setConsent(decision: ConsentDecision): void {
    storeConsent(decision);
    window.gtag?.("consent", "update", {
        analytics_storage: decision === "granted" ? "granted" : "denied",
    });
    // Se manda después de actualizar el permiso para que el propio evento viaje
    // ya bajo las reglas nuevas. Interesa saber qué proporción acepta: si casi
    // nadie lo hace, los números de GA son una muestra y no un censo, y eso
    // cambia cómo se leen.
    track("consent_decision", { consent_decision: decision });
}

let cleanup: (() => void) | null = null;

/**
 * Enseña el banner si todavía no hay decisión, y lo cablea.
 *
 * El banner nace oculto en el HTML: si este script no llega a ejecutarse —o no
 * hay analítica configurada— no aparece nada, en vez de dejar una barra que no
 * responde a los botones.
 */
export function initConsentBanner(): void {
    cleanup?.();

    // La comprobación del ID va primero, y el orden importa: sin él la constante
    // vale `undefined` en tiempo de compilación y el empaquetador se lleva por
    // delante todo lo que viene después. Con el `querySelector` por delante no
    // podría, y este módulo entra en el chunk de arranque de las 27 páginas.
    if (!GA_ID) return;

    const banner = document.querySelector<HTMLElement>("[data-consent-banner]");
    if (!banner) return;

    if (readConsent() !== null) {
        banner.hidden = true;
        return;
    }

    banner.hidden = false;

    const onClick = (event: Event) => {
        const button = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-consent]");
        if (!button) return;
        const decision = button.dataset.consent;
        if (decision !== "granted" && decision !== "denied") return;
        setConsent(decision);
        banner.hidden = true;
    };

    banner.addEventListener("click", onClick);

    cleanup = () => {
        banner.removeEventListener("click", onClick);
        cleanup = null;
    };
}
