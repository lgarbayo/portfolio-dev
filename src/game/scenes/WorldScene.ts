import Phaser from "phaser";
import type { PortfolioWorld } from "../data/portfolioWorlds";

type WorldNode = Phaser.Physics.Arcade.Image & {
    worldData?: PortfolioWorld;
};

export class WorldScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactKey?: Phaser.Input.Keyboard.Key;
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private worldNodes!: Phaser.Physics.Arcade.StaticGroup;
    private selectionTitle!: Phaser.GameObjects.Text;
    private selectionSummary!: Phaser.GameObjects.Text;
    private promptText!: Phaser.GameObjects.Text;
    private highlight?: Phaser.GameObjects.Image;
    private flashMessage?: Phaser.GameObjects.Text;
    private activeWorld?: PortfolioWorld;
    private overlapTimeout = 0;

    constructor() {
        super("WorldScene");
    }

    create() {
        this.cameras.main.setBackgroundColor(0x050a1f);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        this.addGridBackground();
        this.setupPlatforms();
        this.spawnPlayer();
        this.setupUI();
        this.spawnWorldNodes();
    }

    update(time: number) {
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
        this.physics.add.collider(this.player, this.platforms);
    }

    private setupUI() {
        const { width, height } = this.scale;
        this.selectionTitle = this.add.text(32, height - 180, "Explora un mundo", {
            fontFamily: "monospace",
            fontSize: "28px",
            color: "#f8fafc",
        });

        this.selectionSummary = this.add.text(32, height - 130, "Muévete con ← → y salta con ↑", {
            fontFamily: "monospace",
            fontSize: "20px",
            wordWrap: { width: width - 64 },
            color: "#cbd5f5",
        });

        this.promptText = this.add.text(32, height - 70, "Acércate a una puerta y pulsa ENTER para entrar", {
            fontFamily: "monospace",
            fontSize: "18px",
            color: "#94a3b8",
        });

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
        this.selectionTitle.setText(world.title);
        this.selectionSummary.setText(world.summary);
        this.promptText.setText("Pulsa ENTER para visitar este mundo");

        this.highlight
            ?.setPosition(node.x, node.y)
            .setTint(world.color)
            .setVisible(true);
    }

    private handleSelectionTimeout(time: number) {
        if (this.activeWorld && time > this.overlapTimeout) {
            this.activeWorld = undefined;
            this.selectionTitle.setText("Explora un mundo");
            this.selectionSummary.setText("Muévete con ← → y salta con ↑");
            this.promptText.setText("Acércate a una puerta y pulsa ENTER para entrar");
            this.highlight?.setVisible(false);
        }
    }

    private handleMovement() {
        const acceleration = 900;
        if (this.cursors.left?.isDown) {
            this.player.setAccelerationX(-acceleration);
        } else if (this.cursors.right?.isDown) {
            this.player.setAccelerationX(acceleration);
        } else {
            this.player.setAccelerationX(0);
        }

        const isGrounded = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
        if (this.cursors.up?.isDown && isGrounded) {
            this.player.setVelocityY(-560);
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
}
