import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId =
  | "ember"
  | "sunset"
  | "hearth"
  | "dune"
  | "forest"
  | "midnight"
  | "ctos"
  | "mocha";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  swatch: [string, string, string];
}

export const THEMES: Theme[] = [
  { id: "ember",    name: "Ember",    description: "Warm amber glow on slate — the default ambient mood.",
    swatch: ["#2c1f14", "#6b3a1a", "#f0a35a"] },
  { id: "sunset",   name: "Sunset",   description: "Rose, coral and faded magenta dusk.",
    swatch: ["#2a1416", "#7d2f2c", "#f08a5d"] },
  { id: "hearth",   name: "Hearth",   description: "Deep red wood, fireside copper.",
    swatch: ["#1d100c", "#5a2516", "#d96a3a"] },
  { id: "dune",     name: "Dune",     description: "Sandy beige with golden highlights.",
    swatch: ["#2e2818", "#7a6a3e", "#e8c87a"] },
  { id: "forest",   name: "Forest",   description: "Mossy greens and warm bark accents.",
    swatch: ["#16201a", "#3a5a3a", "#a9c97a"] },
  { id: "midnight", name: "Midnight", description: "Deep indigo night with amber lamps.",
    swatch: ["#15172b", "#2a2d4a", "#f0a35a"] },
  { id: "ctos",     name: "ctOS",     description: "Cool steel-blue with amber HUD (original).",
    swatch: ["#13171c", "#283038", "#f0a35a"] },
  { id: "mocha",    name: "Mocha",    description: "Creamy coffee, soft cocoa, gentle latte.",
    swatch: ["#241d16", "#5a4632", "#d8b48a"] },
];

interface Ctx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  themes: Theme[];
}

const ThemeCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "edunexuz-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("ember");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) setThemeState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }

  return <ThemeCtx.Provider value={{ theme, setTheme, themes: THEMES }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
