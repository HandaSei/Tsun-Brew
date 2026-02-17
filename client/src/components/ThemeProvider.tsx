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
    const lastReset = safeGetStorage("tsun-brew-theme-reset-v8");
    if (!lastReset) {
      safeSetStorage("tsun-brew-theme-reset-v8", "true");
      // Clean slate for Brave and other stubborn browsers
      const keysToClear = [
        "tsun-brew-theme-reset-v4",
        "tsun-brew-theme-reset-v5",
        "tsun-brew-theme-reset-v6",
        "tsun-brew-theme-reset-v7",
        "tsun-brew-theme-v2",
        "tsun-brew-theme-v3"
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));
      
      // If no theme or buggy "dark", default to "dusk"
      if (stored === "dark" || !stored) {
        safeSetStorage("tsun-brew-theme", "dusk");
        return "dusk";
      }
    }
    
    return stored || "system";
  });

  const resolvedTheme: ResolvedTheme = theme === "system" ? getSystemTheme() : theme;

  // Use a layout effect to apply the theme before the browser paints
  useEffect(() => {
    applyThemeClass(resolvedTheme);
    
    // Also re-apply after a short delay to catch any race conditions during login/mount
    const timer = setTimeout(() => applyThemeClass(resolvedTheme), 50);
    return () => clearTimeout(timer);
  }, [resolvedTheme]);

  useEffect(() => {
    // Listen for storage changes from other tabs/windows
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "tsun-brew-theme" && e.newValue) {
        setThemeState(e.newValue as Theme);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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

  // Force re-application of theme on every render to combat stubborn browser caching
  if (typeof window !== "undefined") {
    // We wrap this in a small check to avoid infinite loops if applyThemeClass 
    // were to somehow trigger a re-render (which it shouldn't as it touches DOM directly)
    applyThemeClass(resolvedTheme);
  }

  // Add an effect to listen for a custom "theme-refresh" event that we can trigger on login
  useEffect(() => {
    const handleRefresh = () => {
      // Re-read from storage in case it changed during login/session start
      const stored = safeGetStorage("tsun-brew-theme") as Theme;
      if (stored && stored !== theme) {
        setThemeState(stored);
      }
      applyThemeClass(resolvedTheme);
    };
    window.addEventListener("tsun-brew-theme-refresh", handleRefresh);
    return () => window.removeEventListener("tsun-brew-theme-refresh", handleRefresh);
  }, [resolvedTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
