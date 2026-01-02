import "./style.css";
import Phaser from "phaser";
import { gameConfig } from "./game/GameConfig";

window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    preloader.classList.add("fade-out");
    setTimeout(() => {
      preloader.style.display = "none";
      document.body.classList.add("loaded");
    }, 500);
  }
});

let game: Phaser.Game | null = null;
let landingAudioEnabled = false;

const overlay = document.querySelector<HTMLElement>("#game-overlay");
const landingVideo = document.querySelector<HTMLVideoElement>("#landing-video");
const closeOverlayButton = document.querySelector<HTMLButtonElement>("#close-overlay");
const heroArea = document.querySelector<HTMLElement>(".artwork-hero");

const setTouchBlock = (blocked: boolean) => {
    (window as typeof window & { __blockGameInput?: boolean }).__blockGameInput = blocked;
};

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

const returnToMenuFromWorld = () => {
    if (game?.scene.isActive("WorldScene")) {
        game.scene.start("MenuScene");
        return true;
    }
    return false;
};

const preventKeys = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

document.addEventListener(
    "keydown",
    (event) => {
        enableLandingAudio();

        if (overlay?.classList.contains("is-visible")) {
            if (event.key === "Escape") {
                const handled = returnToMenuFromWorld();
                if (!handled) {
                    hideOverlay();
                }
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

const stopPointerPropagation = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
};

closeOverlayButton?.addEventListener("pointerdown", (event) => {
    stopPointerPropagation(event);
    setTouchBlock(true);
});
const releaseBlock = (event: Event) => {
    stopPointerPropagation(event);
    setTimeout(() => setTouchBlock(false), 50);
};
closeOverlayButton?.addEventListener("pointerup", releaseBlock);
closeOverlayButton?.addEventListener("pointercancel", releaseBlock);

closeOverlayButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!returnToMenuFromWorld()) {
        hideOverlay();
    }
    setTimeout(() => setTouchBlock(false), 50);
});

document.querySelectorAll(".modal-close").forEach((button) => {
    const closeModal = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const modalId = button.getAttribute("data-close");
        if (modalId) {
            const modal = document.getElementById(modalId);
            modal?.classList.remove("open");
        }
    };
    
    button.addEventListener("touchend", closeModal, { passive: false });
    button.addEventListener("click", closeModal);
});

heroArea?.addEventListener("click", () => {
    if (overlay?.classList.contains("is-visible")) return;
    enableLandingAudio();
    mountGame();
});
