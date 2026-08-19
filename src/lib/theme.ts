import { createContext, useContext, useEffect, useState } from "react";

type ThemeContextValue = {
  isDark: boolean;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeState(): ThemeContextValue {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeContext.Provider");
  return ctx;
}
