export type PortfolioWorld = {
    id: string;
    title: string;
    color: number;
    position: { x: number; y: number };
    background: {
        key: string;
        path: string;
    };
    structures: {
        pipe: { x: number; y: number; width: number; height: number };
        blocks: { x: number; y: number; width: number; height: number }[];
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
        structures: {
            pipe: { x: 777, y: 616, width: 111, height: 173 },
            blocks: [
                { x: 90, y: 440, width: 20, height: 63 },
                { x: 417, y: 440, width: 275, height: 63 },
                { x: 415, y: 230, width: 18, height: 93 },
            ],
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
        structures: {
            pipe: { x: 777, y: 616, width: 111, height: 138 },
            blocks: [
                { x: 90, y: 460, width: 20, height: 70 },
                { x: 417, y: 460, width: 275, height: 70 },
                { x: 415, y: 230, width: 18, height: 70 },
            ],
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
        structures: {
            pipe: { x: 1000000, y: 10000000, width: 0, height: 0 },
            blocks: [
                { x: 90, y: 460, width: 20, height: 70 },
                { x: 417, y: 460, width: 275, height: 70 },
                { x: 415, y: 230, width: 18, height: 70 },
            ],
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
        structures: {
            pipe: { x: 777, y: 616, width: 111, height: 138 },
            blocks: [
                { x: 90, y: 460, width: 20, height: 70 },
                { x: 417, y: 460, width: 275, height: 70 },
                { x: 415, y: 230, width: 18, height: 70 },
            ],
        },
    },
];
