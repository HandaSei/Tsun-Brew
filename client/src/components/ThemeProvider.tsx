import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dusk" | "dark" | "system";
type ResolvedTheme = "light" | "dusk" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "dusk",
  setTheme: () => {},
  cycleTheme: () => {},
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dusk";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dusk";
}

function safeGetStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetStorage(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}

function applyThemeClass(resolved: ResolvedTheme) {
  const root = document.documentElement;
  // Always remove all possible theme classes first to ensure a clean slate
  root.classList.remove("light", "dark", "dusk");
  
  // Use a data attribute as well for more robust styling and debugging
  root.setAttribute("data-theme", resolved);
  // Also force a re-render of any CSS by briefly toggling a class if needed, 
  // but attribute + classes should be enough for most modern browsers.
  
  if (resolved === "dusk") {
    root.classList.add("dusk");
    root.classList.add("dark");
  } else if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.add("light");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    
    // Check for both old and new keys to handle migration gracefully
    const stored = safeGetStorage("tsun-brew-theme") as Theme;
    
    // Check for a "hard reset" flag to force fresh theme load if needed
    const lastReset = safeGetStorage("tsun-brew-theme-reset-v4");
    if (!lastReset) {
      safeSetStorage("tsun-brew-theme-reset-v4", "true");
      // If we're coming from an old version, maybe we want to force a default
      if (stored === "dark") {
        safeSetStorage("tsun-brew-theme", "dusk");
        return "dusk";
      }
    }
    
    return stored || "system";
  });

  const resolvedTheme: ResolvedTheme = theme === "system" ? getSystemTheme() : theme;

  // Apply theme immediately on mount and whenever it changes
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyThemeClass(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    safeSetStorage("tsun-brew-theme", newTheme);
    // Explicitly apply to avoid lag or sync issues
    const resolved: ResolvedTheme = newTheme === "system" ? getSystemTheme() : (newTheme as ResolvedTheme);
    applyThemeClass(resolved);
  };

  const cycleTheme = () => {
    const order: ResolvedTheme[] = ["light", "dusk", "dark"];
    const currentIdx = order.indexOf(resolvedTheme);
    const nextTheme = order[(currentIdx + 1) % order.length];
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
