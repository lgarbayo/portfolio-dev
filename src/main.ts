import "./style.css";
import Phaser from "phaser";
import { gameConfig } from "./game/GameConfig";

window.addEventListener("DOMContentLoaded", () => {
    const landingVideo = document.querySelector<HTMLVideoElement>("#landing-video");

    const isMobileOrTablet = (() => {
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(navigator.userAgent);
        const hasOrientation = 'orientation' in window || 'onorientationchange' in window;

        return hasTouch && (isMobileUA || hasOrientation);
    })();

    if (landingVideo && isMobileOrTablet) {
        landingVideo.src = "/assets/ui/landing_mobile_V2.mp4";
        landingVideo.load();
    }
});

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
let audioEnabledTime = 0;

const overlay = document.querySelector<HTMLElement>("#game-overlay");
const landingVideo = document.querySelector<HTMLVideoElement>("#landing-video");
const closeOverlayButton = document.querySelector<HTMLButtonElement>("#close-overlay");
const heroArea = document.querySelector<HTMLElement>(".artwork-hero");
const startScreen = document.querySelector<HTMLElement>("#start-screen");
const startButton = document.querySelector<HTMLButtonElement>("#start-game");

const isStarted = () => !startScreen || startScreen.classList.contains("is-dismissed");

// El vídeo de la landing ya está reproduciéndose en mudo detrás de la portada, así
// que al pulsar START GAME entra caliente. Ese clic es además el gesto que el
// navegador exige para permitir audio, de ahí que se active aquí.
const dismissStartScreen = () => {
    if (!startScreen || isStarted()) return;

    startScreen.classList.add("is-dismissed");
    startButton?.blur();
    enableLandingAudio();

    const remove = () => {
        startScreen.style.display = "none";
        startScreen.removeEventListener("transitionend", onFadeEnd);
    };
    // transitionend burbujea: sin filtrar, la transición de color del botón al
    // perder el foco cortaría el fundido a mitad.
    const onFadeEnd = (event: TransitionEvent) => {
        if (event.target === startScreen && event.propertyName === "opacity") {
            remove();
        }
    };
    startScreen.addEventListener("transitionend", onFadeEnd);
    // Respaldo por si la transición no llega a emitirse (reduced motion, pestaña oculta).
    setTimeout(remove, 800);
};

const setTouchBlock = (blocked: boolean) => {
    (window as typeof window & { __blockGameInput?: boolean }).__blockGameInput = blocked;
};

// El menú del juego lee este flag para ignorar el Enter que abrió el overlay:
// si se mantiene pulsado, el auto-repeat del teclado saltaría el menú.
const setEnterHeld = (held: boolean) => {
    (window as typeof window & { __enterHeld?: boolean }).__enterHeld = held;
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
        // Mientras se ve la portada, Enter/Espacio la abren en vez de montar el juego.
        if (!isStarted()) {
            if (event.key === "Enter" || event.code === "Space") {
                event.preventDefault();
                dismissStartScreen();
            }
            return;
        }

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
                setEnterHeld(true);
                mountGame();
            }
            if (preventKeys.has(event.code)) {
                event.preventDefault();
            }
        }
    },
    { passive: false },
);

document.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        setEnterHeld(false);
    }
});

const enableLandingAudio = () => {
    if (!landingVideo || landingAudioEnabled || !isStarted()) return;
    landingVideo.muted = false;
    landingVideo.volume = 0.8;
    landingVideo.play().catch(() => undefined);
    landingAudioEnabled = true;
    audioEnabledTime = Date.now();
};

document.addEventListener("pointerdown", () => {
    enableLandingAudio();
});

startButton?.addEventListener("click", dismissStartScreen);

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
    
    if (!landingAudioEnabled) {
        enableLandingAudio();
        return;
    }
    
    const timeSinceAudioEnabled = Date.now() - audioEnabledTime;
    if (timeSinceAudioEnabled < 300) return;
    
    mountGame();
});
