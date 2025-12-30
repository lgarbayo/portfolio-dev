import Phaser from "phaser";
import type { PortfolioWorld } from "../data/portfolioWorlds";

type WorldNode = Phaser.Physics.Arcade.Image & {
    worldData?: PortfolioWorld;
};

export class WorldScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactKey?: Phaser.Input.Keyboard.Key;
    private waveKey?: Phaser.Input.Keyboard.Key;
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private worldNodes!: Phaser.Physics.Arcade.StaticGroup;
    private highlight?: Phaser.GameObjects.Image;
    private flashMessage?: Phaser.GameObjects.Text;
    private activeWorld?: PortfolioWorld;
    private overlapTimeout = 0;
    private isWaving = false;

    constructor() {
        super("WorldScene");
    }

    create() {
        this.cameras.main.setBackgroundColor(0x050a1f);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.waveKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);

        this.addGridBackground();
        this.setupPlatforms();
        this.spawnPlayer();
        this.setupUI();
        this.spawnWorldNodes();
    }

    update(time: number) {
        this.handleWaveInput();
        this.handleMovement();
        this.handleSelectionTimeout(time);

        if (
            this.activeWorld &&
            this.interactKey &&
            Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
            this.enterWorld(this.activeWorld);
        }
    }

    private addGridBackground() {
        const { width, height } = this.scale;
        const graphics = this.add.graphics({ x: 0, y: 0 });
        graphics.lineStyle(1, 0x0a1638, 0.5);
        const cell = 80;
        for (let x = 0; x <= width; x += cell) {
            graphics.lineBetween(x, 0, x, height);
        }
        for (let y = 0; y <= height; y += cell) {
            graphics.lineBetween(0, y, width, y);
        }
        graphics.setDepth(-1);
    }

    private setupPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        const { width, height } = this.scale;
        const ground = this.platforms.create(width / 2, height - 10, "ground") as Phaser.Physics.Arcade.Image;
        ground.setScale(width / 16, 6);
        ground.refreshBody();
    }

    private spawnPlayer() {
        this.player = this.physics.add.sprite(120, 520, "player");
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.15);
        this.player.setDragX(650);
        this.player.setMaxVelocity(320, 800);
        this.player.setScale(4);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setSize(this.player.width * 0.4, this.player.height * 0.8);
        body.setOffset(this.player.width * 0.3, this.player.height * 0.1);
        this.physics.add.collider(this.player, this.platforms);
        this.player.play("player-idle");
    }

    private setupUI() {
        const { width } = this.scale;
        this.flashMessage = this.add
            .text(width / 2, 80, "", {
                fontFamily: "monospace",
                fontSize: "26px",
                backgroundColor: "#14b8a6",
                color: "#031522",
                padding: { x: 12, y: 8 },
            })
            .setOrigin(0.5)
            .setAlpha(0);

        this.highlight = this.add.image(0, 0, "world-node-highlight").setVisible(false).setDepth(1);
    }

    private spawnWorldNodes() {
        const worlds = (this.registry.get("portfolioWorlds") || []) as PortfolioWorld[];
        this.worldNodes = this.physics.add.staticGroup();

        worlds.forEach((world) => {
            const node = this.worldNodes
                .create(world.position.x, world.position.y, "world-node")
                .setScale(0.9) as WorldNode;
            node.setTint(world.color);
            node.worldData = world;
            node.refreshBody();

            this.add
                .text(world.position.x, world.position.y - 54, world.title, {
                    fontFamily: "monospace",
                    fontSize: "18px",
                    color: "#f8fafc",
                })
                .setOrigin(0.5);
        });

        this.physics.add.overlap(this.player, this.worldNodes, (_player, node) => {
            this.handleWorldOverlap(node as WorldNode);
        });
    }

    private handleWorldOverlap(node: WorldNode) {
        const world = node.worldData;
        if (!world) return;

        this.overlapTimeout = this.time.now + 80;
        if (this.activeWorld?.id === world.id) return;

        this.activeWorld = world;
        this.highlight
            ?.setPosition(node.x, node.y)
            .setTint(world.color)
            .setVisible(true);
    }

    private handleSelectionTimeout(time: number) {
        if (this.activeWorld && time > this.overlapTimeout) {
            this.activeWorld = undefined;
            this.highlight?.setVisible(false);
        }
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

    private enterWorld(world: PortfolioWorld) {
        this.flashMessage?.setText(`Entrando en ${world.title}...`).setAlpha(1);
        this.tweens.add({
            targets: this.flashMessage,
            alpha: 0,
            duration: 1300,
            ease: "Sine.easeInOut",
        });
    }

    private handleWaveInput() {
        if (!this.waveKey || this.isWaving) return;
        if (Phaser.Input.Keyboard.JustDown(this.waveKey)) {
            this.playWaveAnimation();
        }
    }

    private playWaveAnimation() {
        this.isWaving = true;
        this.player.setVelocityX(0);
        this.player.setAccelerationX(0);
        this.player.play("player-wave", true);

        this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (animation: Phaser.Animations.Animation) => {
            if (animation.key === "player-wave") {
                this.isWaving = false;
                this.player.play("player-idle", true);
            }
        });
    }
}
