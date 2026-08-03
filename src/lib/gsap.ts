import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Punto único de entrada a GSAP.
 *
 * Sólo core y ScrollTrigger (decisión D15). Todo lo que necesita este sitio está
 * ahí: el wipe SVG anima `strokeDashoffset` y `stroke-width`, que son
 * propiedades numéricas normales que el core interpola de fábrica — DrawSVG
 * sería un envoltorio sobre trabajo ya hecho.
 *
 * Registrar el plugin una sola vez y en un módulo compartido evita que dos islas
 * lo registren por su cuenta y que GSAP entre dos veces en el bundle.
 */

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
