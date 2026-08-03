import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { WorldScene } from "./scenes/WorldScene";
import { portfolioWorlds } from "./data/portfolioWorlds";

/**
 * Contrato entre la página y el juego.
 *
 * Antes esto se coordinaba con dos globales de `window` (`__enterHeld` y
 * `__blockGameInput`) que la página escribía y las escenas leían. Funcionaba,
 * pero era acoplamiento invisible: un refactor que moviera ficheros lo rompía en
 * silencio, y los dos bugs que esas banderas arreglan —el Enter mantenido que
 * se salta el menú, y el toque en la ✕ que se cuela en el juego— sólo reaparecen
 * en un dispositivo real, tarde.
 *
 * Ahora es una interfaz tipada: si el cableado se rompe, lo dice el compilador.
 */

export interface MountOptions {
    /**
     * `true` cuando el juego se abre con Enter y la tecla sigue pulsada. El menú
     * espera a que se suelte antes de aceptar Enter como selección; si no, el
     * auto-repeat del teclado lanzaría un mundo sin que se llegue a ver el menú.
     */
    suppressInitialEnter?: boolean;
}

export interface GameHandle {
    /**
     * Ignora la entrada del juego mientras dure una interacción de la página
     * —el caso real es un toque que empieza en el botón de cerrar.
     */
    setInputBlocked(blocked: boolean): void;

    /**
     * Vuelve del mundo al menú. Devuelve `false` si ya estaba en el menú, que es
     * la señal que usa el overlay para cerrarse en vez de no hacer nada.
     */
    returnToMenu(): boolean;

    /** Destruye la instancia y suelta el canvas. */
    destroy(): void;
}

export function mountGame(container: HTMLElement, options: MountOptions = {}): GameHandle {
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container,
        pixelArt: true,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1280,
            height: 720,
        },
        physics: {
            default: "arcade",
            arcade: {
                gravity: { x: 0, y: 1000 },
                debug: false,
            },
        },
        scene: [BootScene, MenuScene, WorldScene],
    });

    // El registro es el canal por el que las escenas leen el estado que viene de
    // la página. Se siembra antes de que arranque ninguna escena.
    game.registry.set("portfolioWorlds", portfolioWorlds);
    game.registry.set("suppressInitialEnter", options.suppressInitialEnter ?? false);
    game.registry.set("inputBlocked", false);

    return {
        setInputBlocked(blocked: boolean) {
            game.registry.set("inputBlocked", blocked);
        },

        returnToMenu() {
            if (!game.scene.isActive("WorldScene")) return false;
            game.scene.start("MenuScene");
            return true;
        },

        destroy() {
            // `true` elimina también el canvas del DOM: sin eso el overlay se
            // cierra pero el lienzo se queda colgando en el documento.
            game.destroy(true);
        },
    };
}
