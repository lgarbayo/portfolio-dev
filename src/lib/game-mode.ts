import { prefersReducedMotion } from "./reduced-motion";
import { keyboardIsClaimed } from "./shortcuts";
import type { GameHandle } from "@/game/host";

/**
 * Modo juego: launcher, overlay y ciclo de vida de la instancia.
 *
 * Phaser NO se importa aquí arriba. Entra por `await import()` dentro del
 * handler del clic, que es lo que mantiene el motor fuera del arranque de la
 * página — el objetivo entero de la migración. `scripts/assert-bundle-budget.mjs`
 * rompe el build si algún import estático lo devuelve al chunk de entrada.
 */

let handle: GameHandle | null = null;
let loading = false;
let lastFocused: HTMLElement | null = null;
let cleanup: (() => void) | null = null;

export function initGameMode(): void {
    cleanup?.();

    const overlay = document.querySelector<HTMLElement>("[data-game-overlay]");
    const stage = document.querySelector<HTMLElement>("[data-game-stage]");
    const closeButton = document.querySelector<HTMLElement>("[data-game-close]");
    if (!overlay || !stage || !closeButton) return;

    const loadingEl = overlay.querySelector<HTMLElement>("[data-game-loading]");
    const errorEl = overlay.querySelector<HTMLElement>("[data-game-error]");
    const retryButton = overlay.querySelector<HTMLElement>("[data-game-retry]");

    const isOpen = () => overlay.hasAttribute("data-open");

    const showOverlay = () => {
        overlay.setAttribute("data-open", "");
        overlay.setAttribute("aria-hidden", "false");
        document.body.setAttribute("data-scroll-locked", "");
        closeButton.focus();
    };

    const hideOverlay = () => {
        overlay.removeAttribute("data-open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.removeAttribute("data-scroll-locked");

        handle?.destroy();
        handle = null;

        // Cualquier panel que el juego dejara abierto se cierra con él.
        document
            .querySelectorAll(".portfolio-modal.open")
            .forEach((modal) => modal.classList.remove("open"));

        // El foco vuelve a donde estaba: quien abrió con teclado no debe
        // aparecer al principio del documento al cerrar.
        lastFocused?.focus();
        lastFocused = null;
    };

    const open = async ({ suppressInitialEnter = false } = {}) => {
        if (isOpen() || loading) return;

        lastFocused = document.activeElement as HTMLElement | null;
        loading = true;
        errorEl && (errorEl.hidden = true);
        loadingEl && (loadingEl.hidden = false);
        showOverlay();

        try {
            const { mountGame } = await import("@/game/host");
            handle = mountGame(stage, { suppressInitialEnter });
        } catch (error) {
            console.error("No se pudo cargar el juego:", error);
            // La página de debajo sigue entera: sólo falló esta capa.
            errorEl && (errorEl.hidden = false);
        } finally {
            loading = false;
            loadingEl && (loadingEl.hidden = true);
        }
    };

    /**
     * Cerrar respeta la jerarquía del propio juego: de un mundo se vuelve al
     * menú, y sólo desde el menú se cierra el overlay.
     */
    const closeOrReturn = () => {
        if (handle?.returnToMenu()) return;
        hideOverlay();
    };

    // --- Aperturas ---

    const onOpenClick = (event: Event) => {
        const trigger = (event.target as HTMLElement | null)?.closest("[data-open-game]");
        if (!trigger) return;
        event.preventDefault();
        void open();
    };

    const onKeydown = (event: KeyboardEvent) => {
        if (isOpen()) {
            if (event.key === "Escape") {
                // Si hay un panel de información abierto, Escape lo cierra a él
                // primero: siempre se cierra la capa de más arriba.
                const openModal = document.querySelector(".portfolio-modal.open");
                if (openModal) {
                    openModal.classList.remove("open");
                    return;
                }
                event.preventDefault();
                closeOrReturn();
            }
            return;
        }

        // `G` abre el juego desde cualquier punto de la página, salvo mientras
        // se escribe en un campo.
        if (event.key.toLowerCase() === "g" && !keyboardIsClaimed(event.target)) {
            event.preventDefault();
            void open();
        }
    };

    // Enter merece un camino propio: si el visitante lo mantiene pulsado, el
    // auto-repeat del teclado llegaría al menú del juego y lanzaría un mundo sin
    // que se llegue a ver el menú. Se avisa al montar y el menú espera a que se
    // suelte.
    const onEnterDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" || isOpen() || keyboardIsClaimed(event.target)) return;
        const trigger = (event.target as HTMLElement | null)?.closest("[data-open-game]");
        if (!trigger) return;
        event.preventDefault();
        void open({ suppressInitialEnter: true });
    };

    // --- Cierre ---

    // Un toque que empieza en la ✕ no puede acabar en el juego. Se bloquea la
    // entrada del juego desde `pointerdown` y se suelta un poco después del
    // `pointerup`, ya procesado el clic.
    const onClosePointerDown = (event: Event) => {
        event.stopPropagation();
        event.preventDefault();
        handle?.setInputBlocked(true);
    };

    const releaseBlock = (event: Event) => {
        event.stopPropagation();
        setTimeout(() => handle?.setInputBlocked(false), 50);
    };

    const onCloseClick = (event: Event) => {
        event.stopPropagation();
        closeOrReturn();
        setTimeout(() => handle?.setInputBlocked(false), 50);
    };

    const onRetry = () => {
        errorEl && (errorEl.hidden = true);
        hideOverlay();
        void open();
    };

    // --- Panel de información: cerrar ---

    const onModalClose = (event: Event) => {
        const button = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-close]");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        document.getElementById(button.dataset.close!)?.classList.remove("open");
    };

    document.addEventListener("click", onOpenClick);
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("keydown", onEnterDown);
    closeButton.addEventListener("pointerdown", onClosePointerDown);
    closeButton.addEventListener("pointerup", releaseBlock);
    closeButton.addEventListener("pointercancel", releaseBlock);
    closeButton.addEventListener("click", onCloseClick);
    retryButton?.addEventListener("click", onRetry);
    overlay.addEventListener("click", onModalClose);

    const stopPreview = initLauncherPreview();

    cleanup = () => {
        document.removeEventListener("click", onOpenClick);
        document.removeEventListener("keydown", onKeydown);
        document.removeEventListener("keydown", onEnterDown);
        closeButton.removeEventListener("pointerdown", onClosePointerDown);
        closeButton.removeEventListener("pointerup", releaseBlock);
        closeButton.removeEventListener("pointercancel", releaseBlock);
        closeButton.removeEventListener("click", onCloseClick);
        retryButton?.removeEventListener("click", onRetry);
        overlay.removeEventListener("click", onModalClose);
        stopPreview();
        handle?.destroy();
        handle = null;
        cleanup = null;
    };
}

/**
 * Vista previa del launcher: muda siempre, y sólo cuando el visitante la mira.
 * Con movimiento reducido no se carga ni el vídeo.
 */
function initLauncherPreview(): () => void {
    const video = document.querySelector<HTMLVideoElement>("[data-launcher-preview]");
    const launcher = document.querySelector<HTMLElement>("[data-game-launcher]");
    if (!video || !launcher || prefersReducedMotion()) return () => {};

    const isSmall = window.matchMedia("(max-width: 48rem)").matches;
    const source = isSmall ? video.dataset.srcMobile : video.dataset.srcDesktop;
    if (!source) return () => {};

    let loaded = false;
    const load = () => {
        if (loaded) return;
        video.src = source;
        loaded = true;
    };

    const play = () => {
        load();
        video.muted = true; // Innegociable: nunca suena.
        video.setAttribute("data-playing", "");
        void video.play().catch(() => undefined);
    };

    const pause = () => {
        video.removeAttribute("data-playing");
        video.pause();
    };

    const hasHover = window.matchMedia("(hover: hover)").matches;
    let observer: IntersectionObserver | null = null;

    if (hasHover) {
        launcher.addEventListener("pointerenter", play);
        launcher.addEventListener("pointerleave", pause);
        launcher.addEventListener("focusin", play);
        launcher.addEventListener("focusout", pause);
    } else if ("IntersectionObserver" in window) {
        // En táctil no hay hover: se reproduce cuando el launcher está a la
        // vista y se para cuando deja de estarlo.
        observer = new IntersectionObserver(
            (entries) => entries.forEach((entry) => (entry.isIntersecting ? play() : pause())),
            { threshold: 0.5 },
        );
        observer.observe(launcher);
    }

    return () => {
        launcher.removeEventListener("pointerenter", play);
        launcher.removeEventListener("pointerleave", pause);
        launcher.removeEventListener("focusin", play);
        launcher.removeEventListener("focusout", pause);
        observer?.disconnect();
        pause();
    };
}
