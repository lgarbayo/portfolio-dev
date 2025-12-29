export type PortfolioWorld = {
    id: string;
    title: string;
    summary: string;
    color: number;
    position: { x: number; y: number };
};

export const portfolioWorlds: PortfolioWorld[] = [
    {
        id: "about",
        title: "About Me",
        summary: "Quién soy, qué me inspira y qué impacto busco.",
        color: 0xffc857,
        position: { x: 240, y: 420 },
    },
    {
        id: "projects",
        title: "Proyectos",
        summary: "Selección de productos interactivos y juegos personales.",
        color: 0x00bfb2,
        position: { x: 520, y: 320 },
    },
    {
        id: "skills",
        title: "Skills",
        summary: "Stack favorito: TS, Phaser, frontend moderno, backend ligero.",
        color: 0x5c4b51,
        position: { x: 780, y: 420 },
    },
    {
        id: "experience",
        title: "Experiencia",
        summary: "Empresas, roles clave y aprendizajes con impacto.",
        color: 0xff6b6b,
        position: { x: 1040, y: 320 },
    },
    {
        id: "contact",
        title: "Contacto",
        summary: "LinkedIn, email directo y descarga de CV.",
        color: 0x6a4c93,
        position: { x: 1180, y: 520 },
    },
];
