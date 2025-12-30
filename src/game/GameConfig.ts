import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { WorldScene } from "./scenes/WorldScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "app",
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720,
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 1000 },
            debug: false,
        },
    },
    scene: [BootScene, MenuScene, WorldScene],
};
