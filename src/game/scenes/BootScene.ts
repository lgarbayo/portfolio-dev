import Phaser from "phaser";
import { portfolioWorlds } from "../data/portfolioWorlds";

export class BootScene extends Phaser.Scene {
    constructor() {
        super("BootScene");
    }

    preload() {
        this.createSolidTexture("player", 18, 28, 0xffffff);
        this.createSolidTexture("player-shadow", 18, 6, 0x000000);
        this.createSolidTexture("world-node", 64, 64, 0xffffff);
        this.createSolidTexture("world-node-highlight", 78, 78, 0xffffff);
        this.createSolidTexture("ground", 16, 16, 0x262b44);
    }

    create() {
        this.registry.set("portfolioWorlds", portfolioWorlds);
        this.scene.start("MenuScene");
    }

    private createSolidTexture(
        key: string,
        width: number,
        height: number,
        fillColor: number,
    ) {
        const graphics = this.add.graphics({ x: 0, y: 0 });
        graphics.fillStyle(fillColor, 1);
        graphics.fillRect(0, 0, width, height);
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }
}
