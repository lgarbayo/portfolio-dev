import "./style.css";
import Phaser from "phaser";
import { gameConfig } from "./game/GameConfig";

let game: Phaser.Game | null = null;
let landingAudioEnabled = false;

const overlay = document.querySelector<HTMLElement>("#game-overlay");
const landingVideo = document.querySelector<HTMLVideoElement>("#landing-video");

const showOverlay = () => {
    overlay?.classList.add("is-visible");
    overlay?.setAttribute("aria-hidden", "false");
};

const hideOverlay = () => {
    overlay?.classList.remove("is-visible");
    overlay?.setAttribute("aria-hidden", "true");
    landingVideo?.play().catch(() => undefined);
    game?.destroy(true);
    game = null;
};

const mountGame = () => {
    if (!game) {
        game = new Phaser.Game(gameConfig);
    }
    landingVideo?.pause();
    showOverlay();
};

const preventKeys = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

document.addEventListener(
    "keydown",
    (event) => {
        enableLandingAudio();

        if (overlay?.classList.contains("is-visible")) {
            if (event.key === "Escape") {
                hideOverlay();
            }
        } else {
            if (event.key === "Enter") {
                mountGame();
            }
            if (preventKeys.has(event.code)) {
                event.preventDefault();
            }
        }
    },
    { passive: false },
);

const enableLandingAudio = () => {
    if (!landingVideo || landingAudioEnabled) return;
    landingVideo.muted = false;
    landingVideo.volume = 0.8;
    landingVideo.play().catch(() => undefined);
    landingAudioEnabled = true;
};

document.addEventListener("pointerdown", () => {
    enableLandingAudio();
});
