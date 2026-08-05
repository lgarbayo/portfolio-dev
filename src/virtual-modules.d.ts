/**
 * Tipos de los módulos virtuales que sirve Vite.
 *
 * No existen como fichero en disco, así que TypeScript no puede deducirlos: se
 * declaran aquí a mano y el plugin que los genera tiene que respetar la forma.
 */

declare module "virtual:keycap-icons" {
    /** Logos de las teclas del stack, por slug del campo `icon:` del stack. */
    export const KEYCAP_ICONS: Record<
        string,
        {
            /** El `d` del SVG, ya con todos sus trazos concatenados. */
            path: string;
            /** Color de marca, con almohadilla. */
            color: string;
            title: string;
            /** Lado de la caja del SVG: 24 en Simple Icons, lo que toque en los locales. */
            size: number;
        }
    >;
}
