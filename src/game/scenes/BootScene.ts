import Phaser from "phaser";
import { portfolioWorlds } from "../data/portfolioWorlds";

/**
 * Tiempo mínimo en pantalla.
 *
 * La carga real dura décimas —los fondos son pocos y el navegador los cachea a
 * la segunda partida—, así que sin este suelo la pantalla aparecería y
 * desaparecería en un parpadeo, que se lee como un fallo y no como un arranque.
 */
const MIN_VISIBLE_MS = 800;
const FADE_MS = 240;

const BAR_WIDTH = 420;
const BAR_HEIGHT = 18;

export class BootScene extends Phaser.Scene {
    private startedAt = 0;
    private bar?: Phaser.GameObjects.Graphics;
    private percentText?: Phaser.GameObjects.Text;
    private barX = 0;
    private barY = 0;

    constructor() {
        super("BootScene");
    }

    init() {
        this.startedAt = performance.now();
    }

    preload() {
        // Antes de encolar nada: lo que se pinte aquí es lo que se ve mientras
        // el cargador trabaja, y esta escena no tenía nada, así que el modo juego
        // parecía entrar directo al menú.
        this.createLoadingScreen();
        this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => this.drawProgress(value));

        this.load.spritesheet("player", "/assets/sprites/player.png", {
            frameWidth: 640,
            frameHeight: 640,
        });

        const isTouchDevice = this.sys.game.device.input.touch;
        const isSmallScreen = this.scale.width <= 820;
        const preferMobileAssets = isTouchDevice || isSmallScreen;

        portfolioWorlds.forEach((world) => {
            const backgroundPath =
                preferMobileAssets && world.background.mobilePath
                    ? world.background.mobilePath
                    : world.background.path;
            this.load.image(world.background.key, backgroundPath);
        });

        this.load.svg("home-icon", "/assets/tiles/ui/home-1-svgrepo-com.svg", {
            width: 64,
            height: 64,
        });

        this.createSolidTexture("world-node", 64, 64, 0xffffff);
        this.createSolidTexture("world-node-highlight", 78, 78, 0xffffff);
        this.createSolidTexture("ground", 16, 16, 0x262b44);
        this.createParallaxTextures();
        this.createPipeTexture();
    }

    create() {
        this.createPlayerAnimations();
        this.registry.set("portfolioWorlds", portfolioWorlds);

        // La barra llega al 100% aquí: el evento de progreso se queda en 0.99
        // cuando el último fichero sale de caché en lugar de la red.
        this.drawProgress(1);

        const shown = performance.now() - this.startedAt;
        this.time.delayedCall(Math.max(MIN_VISIBLE_MS - shown, 0), () => {
            // Se funde a negro antes de entregar el mando al menú, que también
            // arranca en negro: el corte queda como un cambio de pantalla y no
            // como un salto.
            this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start("MenuScene");
            });
        });
    }

    /** Título, barra y porcentaje, con la paleta del menú. */
    private createLoadingScreen() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x000000);

        this.add
            .text(width / 2, height * 0.34, "PORTFOLIO QUEST", {
                fontFamily: "monospace",
                fontSize: "48px",
                color: "#5CE68E",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height * 0.44, "CARGANDO", {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#8DA0BF",
            })
            .setOrigin(0.5);

        this.barX = (width - BAR_WIDTH) / 2;
        this.barY = height * 0.55;

        const frame = this.add.graphics();
        frame.lineStyle(2, 0x8da0bf, 1);
        frame.strokeRect(this.barX - 4, this.barY - 4, BAR_WIDTH + 8, BAR_HEIGHT + 8);

        this.bar = this.add.graphics();

        this.percentText = this.add
            .text(width / 2, this.barY + BAR_HEIGHT + 32, "0%", {
                fontFamily: "monospace",
                fontSize: "20px",
                color: "#F5DEB3",
            })
            .setOrigin(0.5);

        this.drawProgress(0);
    }

    private drawProgress(value: number) {
        const clamped = Phaser.Math.Clamp(value, 0, 1);
        this.bar?.clear();
        this.bar?.fillStyle(0x5ce68e, 1);
        this.bar?.fillRect(this.barX, this.barY, BAR_WIDTH * clamped, BAR_HEIGHT);
        this.percentText?.setText(`${Math.round(clamped * 100)}%`);
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

    private createParallaxTextures() {
        this.createGradientTexture("bg-sky", 512, 512, 0x91d1ff, 0xfff3b0);
        this.createMountainTexture("bg-mountains", 512, 256, 0x7c6be6);
        this.createHillsTexture("bg-hills", 512, 256, 0x3da35d, 0x26734d);
        this.createCloudTexture();
    }

    private createGradientTexture(key: string, width: number, height: number, top: number, bottom: number) {
        const graphics = this.add.graphics({ x: 0, y: 0 });
        const topColor = Phaser.Display.Color.IntegerToColor(top);
        const bottomColor = Phaser.Display.Color.IntegerToColor(bottom);
        graphics.fillGradientStyle(topColor.color, topColor.color, bottomColor.color, bottomColor.color, 1);
        graphics.fillRect(0, 0, width, height);
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    private createMountainTexture(key: string, width: number, height: number, color: number) {
        const graphics = this.add.graphics({ x: 0, y: 0 });
        graphics.fillStyle(color, 1);
        graphics.beginPath();
        graphics.moveTo(0, height);
        graphics.lineTo(width * 0.2, height * 0.5);
        graphics.lineTo(width * 0.4, height * 0.75);
        graphics.lineTo(width * 0.65, height * 0.35);
        graphics.lineTo(width, height);
        graphics.closePath();
        graphics.fillPath();
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    private createHillsTexture(key: string, width: number, height: number, baseColor: number, shadowColor: number) {
        const graphics = this.add.graphics({ x: 0, y: 0 });
        graphics.fillStyle(baseColor, 1);
        graphics.fillCircle(width * 0.2, height, height * 0.8);
        graphics.fillCircle(width * 0.5, height, height * 0.95);
        graphics.fillCircle(width * 0.8, height, height * 0.7);
        graphics.fillStyle(shadowColor, 0.6);
        graphics.fillCircle(width * 0.4, height, height * 0.6);
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    private createCloudTexture() {
        const graphics = this.add.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffffff, 0.85);
        graphics.fillCircle(20, 20, 18);
        graphics.fillCircle(44, 12, 22);
        graphics.fillCircle(68, 22, 16);
        graphics.fillRect(20, 20, 48, 20);
        graphics.generateTexture("bg-cloud", 90, 48);
        graphics.destroy();
    }

    private createPipeTexture() {
        const graphics = this.add.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0x24d38d, 1);
        graphics.fillRoundedRect(6, 0, 52, 16, 4);
        graphics.fillRoundedRect(12, 12, 40, 64, 6);
        graphics.lineStyle(2, 0x1a936f, 1);
        graphics.strokeRoundedRect(12, 12, 40, 64, 6);
        graphics.strokeRoundedRect(6, 0, 52, 16, 4);
        graphics.generateTexture("pipe", 64, 80);
        graphics.destroy();
    }

    private createPlayerAnimations() {
        const anims = this.anims;
        const make = (key: string, frames: number[], frameRate: number, repeat: number) => {
            if (anims.exists(key)) return;
            anims.create({
                key,
                frames: anims.generateFrameNumbers("player", { frames }),
                frameRate,
                repeat,
            });
        };

        make("player-idle", [0], 2, -1);
        make("player-run", [1, 0], 8, -1);
        make("player-jump", [2], 1, 0);
        make("player-wave", [3], 8, -1);
    }
}
