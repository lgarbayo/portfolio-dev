import "./style.css";
import Phaser from "phaser";
import { gameConfig } from "./game/GameConfig";

let game: Phaser.Game | null = null;
let landingAudioEnabled = false;

const overlay = document.querySelector<HTMLElement>("#game-overlay");
const landingVideo = document.querySelector<HTMLVideoElement>("#landing-video");
const closeButtons = document.querySelectorAll<HTMLButtonElement>('[data-action="close-game"]');

const showOverlay = () => {
    overlay?.classList.add("is-visible");
    overlay?.setAttribute("aria-hidden", "false");
};

const hideOverlay = () => {
    overlay?.classList.remove("is-visible");
    overlay?.setAttribute("aria-hidden", "true");
    landingVideo?.play().catch(() => undefined);
};

const mountGame = () => {
    if (!game) {
        game = new Phaser.Game(gameConfig);
    }
    landingVideo?.pause();
    showOverlay();
};

closeButtons.forEach((button) => {
    button.addEventListener("click", hideOverlay);
});

const preventKeys = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

document.addEventListener(
    "keydown",
    (event) => {
        enableLandingAudio();

        if (event.key === "Escape" && overlay?.classList.contains("is-visible")) {
            hideOverlay();
        }

        if (event.key === "Enter" && !overlay?.classList.contains("is-visible")) {
            mountGame();
        }

        if (!overlay?.classList.contains("is-visible") && preventKeys.has(event.code)) {
            event.preventDefault();
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

const handlePointerInteraction = () => {
    enableLandingAudio();
    document.removeEventListener("pointerdown", handlePointerInteraction);
};

document.addEventListener("pointerdown", handlePointerInteraction);
