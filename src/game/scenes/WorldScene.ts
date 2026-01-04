import Phaser from "phaser";
import type { PortfolioWorld } from "../data/portfolioWorlds";

export class WorldScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private waveKey?: Phaser.Input.Keyboard.Key;
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private interactiveBlocks!: Phaser.Physics.Arcade.StaticGroup;
    private activeWorld?: PortfolioWorld;
    private isWaving = false;
    private backKey?: Phaser.Input.Keyboard.Key;
    private touchDirection: -1 | 0 | 1 = 0;
    private touchJumpQueued = false;
    private touchWaveActive = false;
    private pendingWavePointer?: Phaser.Input.Pointer;
    private pendingWaveTimer?: Phaser.Time.TimerEvent;
    private touchMeta = new Map<
        number,
        {
            zone: "left" | "center" | "right";
            downTimestamp: number;
            moved: boolean;
            waveFromPointer: boolean;
        }
    >();
    private inputLocked = false;
    private backButton?: Phaser.GameObjects.Container;
    private hintText?: Phaser.GameObjects.Text;

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
        this.addWorldStructures();
        this.spawnPlayer();
        this.setupTouchControls();
        this.createBackButton();
        this.createHintText();
    }

    update() {
        const modalOpen = Boolean(document.querySelector(".portfolio-modal.open"));
        const globalBlock =
            typeof window !== "undefined"
                ? Boolean((window as typeof window & { __blockGameInput?: boolean }).__blockGameInput)
                : false;
        const shouldLock = modalOpen || globalBlock;
        if (shouldLock && !this.inputLocked) {
            this.resetTouchInputs();
        }
        this.inputLocked = shouldLock;

        this.handleWaveInput();
        this.handleMovement();

        if (this.backKey && Phaser.Input.Keyboard.JustDown(this.backKey)) {
            const openModal = document.querySelector(".portfolio-modal.open");
            if (!openModal) {
                this.scene.start("MenuScene");
                return;
            }
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
        const bg = this.add.image(width / 2, height / 2, this.activeWorld.background.key);

        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);

        bg.setScale(scale);
        bg.setScrollFactor(0);
        bg.setDepth(-2);
    }

    private setupPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        this.interactiveBlocks = this.physics.add.staticGroup();
        const { width, height } = this.scale;
        const ground = this.platforms.create(width / 2, height - 10, "ground") as Phaser.Physics.Arcade.Image;
        ground.setScale(width / 16, 6);
        ground.setVisible(false);
        ground.refreshBody();
    }

    private addWorldStructures() {
        const activeWorld = this.activeWorld;
        if (!activeWorld?.structures) return;
        const { pipe, blocks } = activeWorld.structures;

        if (pipe) {
            const pipeSprite = this.platforms.create(pipe.x, pipe.y, "pipe") as Phaser.Physics.Arcade.Image;
            pipeSprite.setDisplaySize(pipe.width, pipe.height);
            pipeSprite.setTint(activeWorld.color);
            pipeSprite.setVisible(false);
            pipeSprite.refreshBody();
        }

        blocks.forEach((blockData, index) => {
            const interactiveIndex = (activeWorld.id === "experience" || activeWorld.id === "projects") ? 2 : 0;
            const targetGroup = index === interactiveIndex ? this.interactiveBlocks : this.platforms;

            const block = targetGroup.create(blockData.x, blockData.y, "brick-block") as Phaser.Physics.Arcade.Image;
            block.setDisplaySize(blockData.width, blockData.height);
            block.setTint(activeWorld.color);
            block.setVisible(false);
            block.refreshBody();

            if (index === interactiveIndex) {
                block.setData("worldId", activeWorld.id);
                block.setData("isHit", false);
            }
        });
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

        this.physics.add.collider(
            this.player,
            this.interactiveBlocks,
            this.onPlayerHitBlock,
            undefined,
            this
        );

        this.player.play("player-idle");
    }

    private setupTouchControls() {
        if (!this.sys.game.device.input.touch) {
            return;
        }

        this.input.addPointer(2);
        this.input.on("pointerdown", this.handlePointerDown, this);
        this.input.on("pointermove", this.handlePointerMove, this);
        this.input.on("pointerup", this.handlePointerUp, this);
        this.input.on("pointerupoutside", this.handlePointerUp, this);
    }

    private isTouchingBackButton(x: number, y: number): boolean {
        if (!this.backButton) return false;

        const buttonX = this.backButton.x;
        const buttonY = this.backButton.y;
        const hitRadius = 120;

        const distance = Math.sqrt(
            Math.pow(x - buttonX, 2) + Math.pow(y - buttonY, 2)
        );

        return distance <= hitRadius;
    }

    private createHintText() {
        const { width } = this.scale;
        const padding = 20;

        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.6);
        background.fillRoundedRect(0, 0, 380, 90, 10);
        background.lineStyle(1, 0x5CE68E, 0.3);
        background.strokeRoundedRect(0, 0, 380, 90, 10);

        if (this.sys.game.device.input.touch) {
            this.hintText = this.add.text(190, 45, 'Tap left/right to move • Tap to jump\nHold center for a surprise', {
                fontSize: '17px',
                color: '#ffffff',
                fontFamily: 'monospace',
                align: 'right',
                lineSpacing: 6
            });
        } else {
            this.hintText = this.add.text(190, 45, '← → Arrows to move ↑ to jump\nB for a surprise', {
                fontSize: '17px',
                color: '#ffffff',
                fontFamily: 'monospace',
                align: 'right',
                lineSpacing: 6
            });
        }

        this.hintText.setOrigin(0.5, 0.5);
        this.hintText.setAlpha(0.85);

        const container = this.add.container(width - 400, padding);
        container.add([background, this.hintText]);
        container.setScrollFactor(0);
        container.setDepth(100);
    }

    private createBackButton() {
        if (!this.sys.game.device.input.touch) {
            return;
        }

        const buttonSize = 52;
        const padding = 18;

        this.backButton = this.add.container(padding + buttonSize / 2, padding + buttonSize / 2);
        this.backButton.setScrollFactor(0);
        this.backButton.setDepth(10000);

        const shadow = this.add.circle(1, 1, buttonSize / 2, 0x000000, 0.4);

        const backgroundOuter = this.add.circle(0, 0, buttonSize / 2, 0x1a1a2e, 0.85);
        const backgroundInner = this.add.circle(0, -2, buttonSize / 2 - 2, 0x2a2a4e, 0.5);

        const border = this.add.circle(0, 0, buttonSize / 2, 0x5CE68E, 0);
        border.setStrokeStyle(2.5, 0x5CE68E, 0.85);

        const arrowText = this.add.text(0, 0, '←', {
            fontSize: '32px',
            color: '#5CE68E',
            fontStyle: 'bold'
        });
        arrowText.setOrigin(0.5, 0.5);

        this.backButton.add([shadow, backgroundOuter, backgroundInner, border, arrowText]);

        this.backButton.setData('background', backgroundOuter);
        this.backButton.setData('border', border);
        this.backButton.setData('arrow', arrowText);
    }


    private getTouchZone(x: number): "left" | "center" | "right" {
        const { width } = this.scale;
        const leftBoundary = width / 3;
        const rightBoundary = (width / 3) * 2;
        if (x < leftBoundary) return "left";
        if (x > rightBoundary) return "right";
        return "center";
    }

    private getPointerMeta(pointer: Phaser.Input.Pointer) {
        let meta = this.touchMeta.get(pointer.id);
        if (!meta) {
            meta = {
                zone: "center",
                downTimestamp: this.time.now,
                moved: false,
                waveFromPointer: false,
            };
            this.touchMeta.set(pointer.id, meta);
        }
        return meta;
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (this.inputLocked) return;
        if (!pointer.primaryDown) return;

        if (this.backButton && this.isTouchingBackButton(pointer.x, pointer.y)) {
            const background = this.backButton.getData('background');
            const border = this.backButton.getData('border');
            const arrow = this.backButton.getData('arrow');

            if (background) {
                background.setAlpha(0.95);
            }
            if (border) {
                border.setStrokeStyle(2.5, 0x5CE68E, 1);
            }
            if (arrow) {
                arrow.setScale(0.95);
            }
            return;
        }

        const meta = this.getPointerMeta(pointer);
        meta.downTimestamp = this.time.now;
        meta.moved = false;
        const zone = this.getTouchZone(pointer.x);
        meta.zone = zone;

        if (zone === "center") {
            meta.waveFromPointer = false;
            this.scheduleWaveFromPointer(pointer);
        } else {
            this.cancelPendingWave(pointer);
            this.touchDirection = zone === "left" ? -1 : 1;
            meta.waveFromPointer = false;
        }
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (this.inputLocked) return;
        if (!pointer.isDown) return;

        if (this.backButton && this.isTouchingBackButton(pointer.x, pointer.y)) {
            return;
        }

        const meta = this.getPointerMeta(pointer);
        meta.moved = true;
        const zone = this.getTouchZone(pointer.x);
        const previousZone = meta.zone;
        if (zone === previousZone) return;
        meta.zone = zone;

        if (zone === "center") {
            this.touchDirection = 0;
            meta.waveFromPointer = false;
            this.scheduleWaveFromPointer(pointer);
        } else {
            this.cancelPendingWave(pointer);
            if (meta.waveFromPointer) {
                this.touchWaveActive = false;
                this.stopWave();
                meta.waveFromPointer = false;
            }
            this.touchDirection = zone === "left" ? -1 : 1;
        }
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer) {
        if (this.inputLocked) return;

        if (this.backButton && this.isTouchingBackButton(pointer.x, pointer.y)) {
            const background = this.backButton.getData('background');
            const border = this.backButton.getData('border');
            const arrow = this.backButton.getData('arrow');

            if (background) {
                background.setAlpha(0.85);
            }
            if (border) {
                border.setStrokeStyle(2.5, 0x5CE68E, 0.85);
            }
            if (arrow) {
                arrow.setScale(1);
            }

            const openModal = document.querySelector('.portfolio-modal.open');
            if (!openModal) {
                this.scene.start('MenuScene');
            }
            return;
        }

        const meta = this.touchMeta.get(pointer.id);
        const zone = meta?.zone;
        const downTimestamp = meta?.downTimestamp ?? this.time.now;
        const moved = meta?.moved ?? false;
        const waveFromPointer = meta?.waveFromPointer ?? false;
        const duration = this.time.now - downTimestamp;

        this.cancelPendingWave(pointer);
        if (waveFromPointer) {
            this.touchWaveActive = false;
            this.stopWave();
            if (meta) meta.waveFromPointer = false;
        }

        if (zone === "left" || zone === "right") {
            this.touchDirection = 0;
        }

        if (!waveFromPointer && (duration < 200 || (!moved && duration < 250))) {
            this.touchJumpQueued = true;
        }

        if (meta) {
            this.touchMeta.delete(pointer.id);
        }
    }

    private scheduleWaveFromPointer(pointer: Phaser.Input.Pointer) {
        if (this.inputLocked) return;
        this.cancelPendingWave(pointer);
        this.touchDirection = 0;
        this.pendingWavePointer = pointer;
        const meta = this.getPointerMeta(pointer);
        this.pendingWaveTimer = this.time.delayedCall(
            250,
            () => {
                if (!pointer.isDown) return;
                this.touchWaveActive = true;
                meta.waveFromPointer = true;
                if (!this.isWaving) {
                    this.startWave();
                } else {
                    this.player.play("player-wave", true);
                }
            },
            undefined,
            this,
        );
    }

    private cancelPendingWave(pointer?: Phaser.Input.Pointer) {
        if (pointer && this.pendingWavePointer && this.pendingWavePointer.id !== pointer.id) {
            return;
        }
        this.pendingWaveTimer?.remove(false);
        this.pendingWaveTimer = undefined;
        this.pendingWavePointer = undefined;
    }

    private resetTouchInputs() {
        this.touchDirection = 0;
        this.touchJumpQueued = false;
        this.touchWaveActive = false;
        this.pendingWaveTimer?.remove(false);
        this.pendingWaveTimer = undefined;
        this.pendingWavePointer = undefined;
        this.touchMeta.clear();
        if (this.isWaving) {
            this.stopWave();
        }
    }

    private handleMovement() {
        if (this.inputLocked) {
            this.player.setAccelerationX(0);
            if (this.player.anims.currentAnim?.key !== "player-idle") {
                this.player.play("player-idle", true);
            }
            return;
        }

        if (this.isWaving) {
            this.player.setAccelerationX(0);
            return;
        }

        const acceleration = 900;
        const jumpVelocity = -750;
        let moving = false;
        let direction = 0;
        if (this.cursors.left?.isDown) direction -= 1;
        if (this.cursors.right?.isDown) direction += 1;
        if (direction === 0) direction = this.touchDirection;

        if (direction !== 0) {
            this.player.setAccelerationX(direction === -1 ? -acceleration : acceleration);
            this.player.setFlipX(direction === -1);
            moving = true;
        } else {
            this.player.setAccelerationX(0);
        }

        const isGrounded = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
        const keyboardJump = Boolean(this.cursors.up?.isDown);
        const touchJump = this.touchJumpQueued;
        const jumpPressed = keyboardJump || touchJump;
        const initiatedJump = jumpPressed && isGrounded;
        if (initiatedJump) {
            this.player.setVelocityY(jumpVelocity);
            this.player.play("player-jump", true);
            if (touchJump) {
                this.touchJumpQueued = false;
            }
        } else if (touchJump && !keyboardJump) {
            this.touchJumpQueued = false;
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
        if (!this.waveKey || this.touchWaveActive || this.inputLocked) {
            if (this.inputLocked && this.isWaving) {
                this.stopWave();
            }
            return;
        }

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

    private onPlayerHitBlock(
        playerObj:
            | Phaser.Types.Physics.Arcade.GameObjectWithBody
            | Phaser.Physics.Arcade.Body
            | Phaser.Physics.Arcade.StaticBody
            | Phaser.Tilemaps.Tile,
        blockObj:
            | Phaser.Types.Physics.Arcade.GameObjectWithBody
            | Phaser.Physics.Arcade.Body
            | Phaser.Physics.Arcade.StaticBody
            | Phaser.Tilemaps.Tile,
    ) {
        const resolveGameObject = (
            target:
                | Phaser.Types.Physics.Arcade.GameObjectWithBody
                | Phaser.Physics.Arcade.Body
                | Phaser.Physics.Arcade.StaticBody
                | Phaser.Tilemaps.Tile,
        ): Phaser.GameObjects.GameObject | null => {
            if (target instanceof Phaser.Physics.Arcade.Body || target instanceof Phaser.Physics.Arcade.StaticBody) {
                return target.gameObject as Phaser.GameObjects.GameObject;
            }
            if (target instanceof Phaser.Tilemaps.Tile) {
                return target.tilemapLayer ?? null;
            }
            return target;
        };

        const player = resolveGameObject(playerObj);
        const block = resolveGameObject(blockObj);
        if (!player || !block) return;
        if (!(player instanceof Phaser.Physics.Arcade.Sprite)) return;
        if (!(block instanceof Phaser.Physics.Arcade.Image || block instanceof Phaser.Physics.Arcade.Sprite)) return;

        const playerBody = player.body as Phaser.Physics.Arcade.Body | undefined;
        if (!playerBody) return;

        const hitFromBelow = playerBody.touching.up || playerBody.blocked.up;
        if (!hitFromBelow) return;

        const isHit = block.getData("isHit");
        if (isHit) return;

        block.setData("isHit", true);

        const worldId = block.getData("worldId");

        block.setData("isHit", true);

        const modalId = `${worldId}Modal`;
        const modal = document.getElementById(modalId);

        if (modal) {
            modal.classList.add("open");
        }

        this.time.delayedCall(1000, () => {
            block.setData("isHit", false);
        });
    }
}
