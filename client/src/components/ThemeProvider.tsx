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
    
    // Migration logic for old "dark" users to "dusk"
    if (stored === "dark" && !safeGetStorage("tsun-brew-theme-v3")) {
      safeSetStorage("tsun-brew-theme", "dusk");
      safeSetStorage("tsun-brew-theme-v3", "1");
      return "dusk";
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
