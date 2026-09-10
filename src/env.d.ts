/// <reference types="astro/client" />

/**
 * Variables de entorno del cliente.
 *
 * Astro sólo expone al navegador las que empiezan por `PUBLIC_`, y las inlinea
 * en el build: lo que no esté definido al compilar vale `undefined` y el código
 * que cuelga de ello se cae del bundle por tree-shaking. Es justo lo que
 * queremos con la analítica — sin `PUBLIC_GA_ID` no se envía nada ni se
 * descarga gtag.
 */
interface ImportMetaEnv {
    /**
     * Measurement ID de GA4, con el formato `G-XXXXXXXXXX`. Se saca de
     * Analytics → Administrar → Flujos de datos. Sin él la web funciona igual
     * y no mide nada.
     */
    readonly PUBLIC_GA_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
