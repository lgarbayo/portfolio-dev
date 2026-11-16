/**
 * Las tres ciudades de fondo de «Sobre mí»: de dónde soy (Ourense), donde
 * empezaron los hackathons (A Coruña) y donde han acabado llevándome (Madrid).
 *
 * Las fotos son de Wikimedia Commons, con licencias que piden atribución; el
 * crédito se pinta junto a cada una. La procedencia completa está también en
 * `public/assets/places/sources.json`. Se han reducido y oscurecido un poco
 * (`magick -resize 2400x -modulate 82,88`) para que los paneles se lean encima.
 */
export interface Place {
    slug: string;
    city: string;
    landmark: string;
    coords: string;
    photo: string;
    photoNarrow: string;
    author: string;
    license: string;
    source: string;
}

export const places: readonly Place[] = [
    {
        slug: "ourense",
        city: "Ourense",
        landmark: "Ponte do Milenio",
        coords: "42.34° N, 7.86° W",
        photo: "/assets/places/ourense.webp",
        photoNarrow: "/assets/places/ourense-narrow.webp",
        author: "Gregorio Puga Bailón",
        license: "CC BY 2.0",
        source: "https://commons.wikimedia.org/wiki/File:Ponte_do_Milenio,_Ourense_(27636947530).jpg",
    },
    {
        slug: "coruna",
        city: "A Coruña",
        landmark: "Torre de Hércules",
        coords: "43.39° N, 8.41° W",
        photo: "/assets/places/coruna.webp",
        photoNarrow: "/assets/places/coruna-narrow.webp",
        author: "Galajatuna",
        license: "CC BY-SA 3.0 ES",
        source: "https://commons.wikimedia.org/wiki/File:Torre_De_Hercules.jpg",
    },
    {
        slug: "madrid",
        city: "Madrid",
        landmark: "Gran Vía",
        coords: "40.42° N, 3.71° W",
        photo: "/assets/places/madrid.webp",
        photoNarrow: "/assets/places/madrid-narrow.webp",
        author: "Tim Adams",
        license: "CC BY 3.0",
        source: "https://commons.wikimedia.org/wiki/File:View_of_Edificio_Espa%C3%B1a_and_Gran_V%C3%ADa_at_night.jpg",
    },
];
