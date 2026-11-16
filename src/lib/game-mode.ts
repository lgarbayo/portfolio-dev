import { keyboardIsClaimed } from "./shortcuts";
import { track } from "./analytics";
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
        track("game_close");

        // Cualquier panel que el juego dejara abierto se cierra con él.
        document
            .querySelectorAll(".portfolio-modal.open")
            .forEach((modal) => modal.classList.remove("open"));

        // El foco vuelve a donde estaba: quien abrió con teclado no debe
        // aparecer al principio del documento al cerrar.
        lastFocused?.focus();
        lastFocused = null;
    };

    const open = async ({ suppressInitialEnter = false, trigger = "pointer" } = {}) => {
        if (isOpen() || loading) return;

        // Se cuenta la apertura y, aparte, cuánto tardó en estar jugable:
        // Phaser entra por import dinámico y es el bulto más grande del
        // sitio, así que ese tiempo es el que decide si alguien espera.
        track("game_open", { game_trigger: trigger });
        const started = performance.now();

        lastFocused = document.activeElement as HTMLElement | null;
        loading = true;
        errorEl && (errorEl.hidden = true);
        loadingEl && (loadingEl.hidden = false);
        showOverlay();

        try {
            const { mountGame } = await import("@/game/host");
            handle = mountGame(stage, { suppressInitialEnter });
            track("game_ready", { load_ms: Math.round(performance.now() - started) });
        } catch (error) {
            console.error("No se pudo cargar el juego:", error);
            track("game_error");
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
            void open({ trigger: "keyboard" });
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
        void open({ suppressInitialEnter: true, trigger: "keyboard" });
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
        handle?.destroy();
        handle = null;
        cleanup = null;
    };
}
