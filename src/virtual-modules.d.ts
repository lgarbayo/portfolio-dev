/**
 * Tipos de los módulos virtuales que sirve Vite.
 *
 * No existen como fichero en disco, así que TypeScript no puede deducirlos: se
 * declaran aquí a mano y el plugin que los genera tiene que respetar la forma.
 */

declare module "virtual:keycap-icons" {
    /** Logos de las teclas del stack, por slug de Simple Icons. */
    export const KEYCAP_ICONS: Record<
        string,
        {
            /** El `d` de un SVG de 24x24. */
            path: string;
            /** Color de marca, con almohadilla. */
            color: string;
            title: string;
        }
    >;
}
