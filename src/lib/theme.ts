import type { TransitionBeforeSwapEvent } from "astro:transitions/client";

type Theme = "light" | "dark";
const storageKey = "portfolio-theme";
let initialized = false;

function applyTheme(theme: Theme, target: Document = document) {
    const changed = target.documentElement.dataset.theme !== theme;
    target.documentElement.dataset.theme = theme;
    target.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#181a1d" : "#e6e6e6");
    target.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((button) => {
        const label = theme === "dark" ? button.dataset.labelLight! : button.dataset.labelDark!;
        button.setAttribute("aria-label", label);
        button.title = label;
    });
    if (changed && target === document) {
        document.dispatchEvent(new CustomEvent("portfolio:theme-change"));
    }
}

export function initTheme() {
    if (initialized) return;
    initialized = true;
    const currentTheme = (): Theme => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    applyTheme(currentTheme());
    document.addEventListener("click", (event) => {
        if (!(event.target instanceof Element) || !event.target.closest("[data-theme-toggle]")) return;
        const theme = currentTheme() === "dark" ? "light" : "dark";
        applyTheme(theme);
        try { localStorage.setItem(storageKey, theme); } catch { /* La selección funciona también sin almacenamiento. */ }
    });
    document.addEventListener("astro:before-swap", (event) => {
        applyTheme(currentTheme(), (event as TransitionBeforeSwapEvent).newDocument);
    });
    document.addEventListener("astro:page-load", () => applyTheme(currentTheme()));
    window.addEventListener("storage", (event) => {
        if (event.key === storageKey) applyTheme(event.newValue === "dark" ? "dark" : "light");
    });
}
