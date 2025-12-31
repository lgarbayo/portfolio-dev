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
            pipe: { x: 820, y: 596, width: 105, height: 115 },
            blocks: [
                { x: 501, y: 452, width: 51, height: 52 },
                { x: 387, y: 451, width: 51, height: 53 },
                { x: 103, y: 447, width: 51, height: 52 },
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
            pipe: { x: 826, y: 616, width: 77, height: 103 },
            blocks: [
                { x: 98, y: 478, width: 48, height: 41 },
                { x: 498, y: 479, width: 36, height: 31 },
                { x: 387, y: 472, width: 26, height: 19 },
            ],
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
        structures: {
            pipe: { x: 705, y: 621, width: 269, height: 137 },
            blocks: [
                { x: 496, y: 482, width: 44, height: 19 },
                { x: 100, y: 458, width: 25, height: 18 },
                { x: 387, y: 458, width: 25, height: 19 },
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
            pipe: { x: 102, y: 567, width: 111, height: 46 },
            blocks: [
                { x: 386, y: 457, width: 26, height: 19 },
                { x: 502, y: 456, width: 27, height: 21 },
                { x: 100, y: 456, width: 27, height: 20 },
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
            pipe: { x: 631, y: 651, width: 231, height: 56 },
            blocks: [
                { x: 494, y: 484, width: 40, height: 32 },
                { x: 385, y: 487, width: 48, height: 25 },
                { x: 100, y: 460, width: 25, height: 15 },
            ],
        },
    },
];
