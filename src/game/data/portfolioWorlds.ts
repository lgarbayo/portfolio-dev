export type PortfolioWorld = {
    id: string;
    title: string;
    color: number;
    position: { x: number; y: number };
    background: {
        key: string;
        path: string;
    };
};

export const portfolioWorlds: PortfolioWorld[] = [
    {
        id: "about",
        title: "ABOUT ME",
        color: 0xffc857,
        position: { x: 240, y: 420 },
        background: {
            key: "world-bg-about",
            path: "/assets/tiles/about me.jpeg",
        },
    },
    {
        id: "projects",
        title: "PROJECTS",
        color: 0x00bfb2,
        position: { x: 520, y: 320 },
        background: {
            key: "world-bg-projects",
            path: "/assets/tiles/projects.jpeg",
        },
    },
    {
        id: "skills",
        title: "SKILLS",
        color: 0x5c4b51,
        position: { x: 780, y: 420 },
        background: {
            key: "world-bg-skills",
            path: "/assets/tiles/skills.jpeg",
        },
    },
    {
        id: "experience",
        title: "EXPERIENCE",
        color: 0xff6b6b,
        position: { x: 1040, y: 320 },
        background: {
            key: "world-bg-experience",
            path: "/assets/tiles/experience.jpeg",
        },
    },
    {
        id: "contact",
        title: "CONTACT",
        color: 0x6a4c93,
        position: { x: 1180, y: 520 },
        background: {
            key: "world-bg-contact",
            path: "/assets/tiles/contact.jpeg",
        },
    },
];
