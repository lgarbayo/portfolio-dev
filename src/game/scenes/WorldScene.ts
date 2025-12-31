import Phaser from "phaser";
import type { PortfolioWorld } from "../data/portfolioWorlds";

export class WorldScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private waveKey?: Phaser.Input.Keyboard.Key;
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private activeWorld?: PortfolioWorld;
    private isWaving = false;
    private backKey?: Phaser.Input.Keyboard.Key;

    constructor() {
        super("WorldScene");
    }

    create() {
        const worlds = (this.registry.get("portfolioWorlds") || []) as PortfolioWorld[];
        this.activeWorld = this.getSelectedWorld(worlds);
        this.cameras.main.setBackgroundColor(0x000000);
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.waveKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.backKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);

        this.addWorldBackground();
        this.setupPlatforms();
        this.spawnPlayer();
    }

    update() {
        this.handleWaveInput();
        this.handleMovement();

        if (this.backKey && Phaser.Input.Keyboard.JustDown(this.backKey)) {
            this.scene.start("MenuScene");
            return;
        }
    }

    private getSelectedWorld(worlds: PortfolioWorld[]): PortfolioWorld | undefined {
        if (!worlds.length) return undefined;
        const selectedId = this.registry.get("selectedWorldId") as string | undefined;
        const match = selectedId ? worlds.find((world) => world.id === selectedId) : undefined;
        return match ?? worlds[0];
    }

    private addWorldBackground() {
        if (!this.activeWorld) return;
        const { width, height } = this.scale;
        this.add
            .image(width / 2, height / 2, this.activeWorld.background.key)
            .setDisplaySize(width, height)
            .setDepth(-2);
    }

    private setupPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        const { width, height } = this.scale;
        const ground = this.platforms.create(width / 2, height - 10, "ground") as Phaser.Physics.Arcade.Image;
        ground.setScale(width / 16, 6);
        ground.setVisible(false);
        ground.refreshBody();
    }

    private spawnPlayer() {
        this.player = this.physics.add.sprite(120, 520, "player");
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.15);
        this.player.setDragX(650);
        this.player.setMaxVelocity(320, 800);
        this.player.setScale(0.2);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setSize(this.player.width * 0.3, this.player.height * 0.8);
        body.setOffset(this.player.width * 0.225, this.player.height * 0.1);
        this.physics.add.collider(this.player, this.platforms);
        this.player.play("player-idle");
    }

    private handleMovement() {
        if (this.isWaving) {
            this.player.setAccelerationX(0);
            return;
        }

        const acceleration = 900;
        let moving = false;
        if (this.cursors.left?.isDown) {
            this.player.setAccelerationX(-acceleration);
            this.player.setFlipX(true);
            moving = true;
        } else if (this.cursors.right?.isDown) {
            this.player.setAccelerationX(acceleration);
            this.player.setFlipX(false);
            moving = true;
        } else {
            this.player.setAccelerationX(0);
        }

        const isGrounded = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
        const jumpPressed = this.cursors.up?.isDown;
        const initiatedJump = jumpPressed && isGrounded;
        if (initiatedJump) {
            this.player.setVelocityY(-560);
            this.player.play("player-jump", true);
        }

        if (!isGrounded || initiatedJump) {
            if (this.player.anims.currentAnim?.key !== "player-jump") {
                this.player.play("player-jump", true);
            }
            return;
        }

        if (moving) {
            this.player.play("player-run", true);
        } else if (this.player.anims.currentAnim?.key !== "player-idle") {
            this.player.play("player-idle", true);
        }
    }

    private handleWaveInput() {
        if (!this.waveKey) return;

        if (this.waveKey.isDown && !this.isWaving) {
            this.startWave();
        } else if (this.waveKey.isUp && this.isWaving) {
            this.stopWave();
        }
    }

    private startWave() {
        this.isWaving = true;
        this.player.setVelocityX(0);
        this.player.setAccelerationX(0);
        this.player.play("player-wave", true);
    }

    private stopWave() {
        this.isWaving = false;
        this.player.play("player-idle", true);
    }
}
