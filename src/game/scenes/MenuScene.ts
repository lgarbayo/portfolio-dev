import Phaser from "phaser";
import type { PortfolioWorld } from "../data/portfolioWorlds";

export class MenuScene extends Phaser.Scene {
    private startKey?: Phaser.Input.Keyboard.Key;

    constructor() {
        super("MenuScene");
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x030712);

        const title = this.add
            .text(width / 2, height * 0.22, "Portfolio Overworld", {
                fontFamily: "monospace",
                fontSize: "48px",
                color: "#FFFFFF",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, title.y + 72, "Un CV jugable construido con Phaser + TS", {
                fontFamily: "monospace",
                fontSize: "20px",
                color: "#cbd5f5",
            })
            .setOrigin(0.5);

        const worlds = (this.registry.get("portfolioWorlds") || []) as PortfolioWorld[];
        const worldIntro = this.add.container(width / 2, height * 0.52);

        worlds.forEach((world, index) => {
            this.addWorldRow(worldIntro, world, index);
        });

        const startButton = this.add
            .text(width / 2, height * 0.82, "PULSA ENTER O CLICK PARA JUGAR", {
                fontFamily: "monospace",
                fontSize: "24px",
                backgroundColor: "#14b8a6",
                color: "#031522",
                padding: { x: 12, y: 8 },
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startButton.on("pointerdown", () => this.launchWorld());
        startButton.on("pointerover", () => startButton.setStyle({ backgroundColor: "#2dd4bf" }));
        startButton.on("pointerout", () => startButton.setStyle({ backgroundColor: "#14b8a6" }));

        this.startKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.startKey?.once("down", () => this.launchWorld());
    }

    update() {
        if (this.startKey?.isDown) {
            this.launchWorld();
        }
    }

    private addWorldRow(container: Phaser.GameObjects.Container, world: PortfolioWorld, index: number) {
        const y = index * 44;
        const dot = this.add.rectangle(-220, y, 22, 22, world.color).setOrigin(0.5);
        const label = this.add
            .text(-180, y, `${index + 1}. ${world.title}`, {
                fontFamily: "monospace",
                fontSize: "20px",
                color: "#f1f5f9",
            })
            .setOrigin(0, 0.5);
        const summary = this.add
            .text(-20, y, world.summary, {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#94a3b8",
                wordWrap: { width: 500 },
            })
            .setOrigin(0, 0.5);
        container.add([dot, label, summary]);
    }

    private launchWorld() {
        this.scene.start("WorldScene");
    }
}
