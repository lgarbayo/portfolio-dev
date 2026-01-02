import Phaser from "phaser";
import type { PortfolioWorld } from "../data/portfolioWorlds";

export class MenuScene extends Phaser.Scene {
    private startKey?: Phaser.Input.Keyboard.Key;
    private cursor?: Phaser.GameObjects.Sprite;
    private worlds: PortfolioWorld[] = [];
    private selectedIndex = 0;
    private entries: Phaser.GameObjects.Container[] = [];
    private tapZones: Phaser.GameObjects.Zone[] = [];

    constructor() {
        super("MenuScene");
    }

    create() {
        const { width, height } = this.scale;
        this.worlds = (this.registry.get("portfolioWorlds") || []) as PortfolioWorld[];
        const savedWorldId = this.registry.get("selectedWorldId") as string | undefined;
        if (savedWorldId) {
            const savedIndex = this.worlds.findIndex((world) => world.id === savedWorldId);
            this.selectedIndex = savedIndex >= 0 ? savedIndex : 0;
        } else {
            this.selectedIndex = 0;
        }
        this.entries = [];

        this.createBackdrop(width, height);
        this.createTitle(width, height);
        this.createWorldList(width, height);
        this.createHint(width, height);

        this.startKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.startKey?.once("down", () => this.launchWorld());

        this.input.keyboard?.on("keydown-UP", () => this.moveSelection(-1));
        this.input.keyboard?.on("keydown-DOWN", () => this.moveSelection(1));
        this.input.keyboard?.on("keydown-SPACE", () => this.launchWorld());
    }

    update() {
        if (this.startKey?.isDown) {
            this.launchWorld();
        }
    }

    private createBackdrop(width: number, height: number) {
        this.cameras.main.setBackgroundColor(0x000000);

        const scanlines = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.25 } });
        for (let y = 0; y < height; y += 4) {
            scanlines.fillRect(0, y, width, 2);
        }
        scanlines.setDepth(1);
    }

    private createTitle(width: number, height: number) {
        const title = this.add
            .text(width / 2, height * 0.13, "PORTFOLIO QUEST", {
                fontFamily: "monospace",
                fontSize: "56px",
                color: "#5CE68E",
            })
            .setOrigin(0.5);

        this.tweens.add({
            targets: title,
            alpha: 0.35,
            duration: 600,
            yoyo: true,
            repeat: -1,
        });
    }

    private createWorldList(width: number, height: number) {
        const listX = width * 0.3;
        const listY = height * 0.30;
        const spacing = 68;

        this.cursor = this.add.sprite(listX - 46, listY, "player").setScale(0.09);
        this.cursor.play("player-run");

        this.worlds.forEach((world, index) => {
            const row = this.add.container(listX, listY + index * spacing);
            const badge = this.add.rectangle(-12, 0, 26, 26, world.color).setOrigin(0.5);
            const name = this.add
                .text(20, 0, `${index + 1}. ${world.title}`, {
                    fontFamily: "monospace",
                    fontSize: "26px",
                    color: "#F5DEB3",
                })
                .setOrigin(0, 0.5);

            row.add([badge, name]);
            row.setAlpha(index === this.selectedIndex ? 1 : 0.35);
            this.entries.push(row);

            const zone = this.add
                .zone(width * 0.5, listY + index * spacing, width * 0.8, spacing)
                .setInteractive({ useHandCursor: true });
            zone.on("pointerdown", () => this.setSelection(index));
            zone.on("pointerup", () => {
                this.setSelection(index);
                this.launchWorld();
            });
            this.tapZones.push(zone);
        });

        this.updateCursorPosition();
    }

    private createHint(width: number, height: number) {
        this.add
            .text(width / 2, height * 0.82, "ENTER/SPACE TO START · BACKSPACE TO RETURN", {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#8DA0BF",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height * 0.9, "© 2026 Luis Garbayo Fernández · MADE WITH PHASER && TS", {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#5CE68E",
            })
            .setOrigin(0.5);
    }

    private moveSelection(delta: number) {
        const total = this.worlds.length;
        this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + delta, 0, total);
        this.updateCursorPosition();
    }

    private updateCursorPosition() {
        this.entries.forEach((entry, idx) => {
            entry.setAlpha(idx === this.selectedIndex ? 1 : 0.35);
        });

        const entry = this.entries[this.selectedIndex];
        if (!entry || !this.cursor) return;
        this.cursor.setPosition(entry.x - 46, entry.y);
        if (this.cursor.anims.currentAnim?.key !== "player-run") {
            this.cursor.play("player-run");
        }
    }

    private setSelection(index: number) {
        if (!this.worlds.length) return;
        this.selectedIndex = Phaser.Math.Clamp(index, 0, this.worlds.length - 1);
        this.updateCursorPosition();
    }

    private launchWorld() {
        const selectedWorld = this.worlds[this.selectedIndex];
        this.registry.set("selectedWorldId", selectedWorld?.id ?? "about");
        this.scene.start("WorldScene");
    }
}
