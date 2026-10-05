"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  systemTheme?: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "crime-app-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as Theme | null;
      if (saved && (saved === "dark" || saved === "light" || saved === "system")) {
        setThemeState(saved);
      }
    } catch (e) {
      console.warn("Could not read theme from localStorage", e);
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted && typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const getSystemTheme = () => (media.matches ? "dark" : "light");

    const effective = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(effective);

    const root = document.documentElement;
    if (effective === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    }

    const handleChange = () => {
      if (theme === "system") {
        const sys = getSystemTheme();
        setResolvedTheme(sys);
        if (sys === "dark") {
          root.classList.add("dark");
          root.classList.remove("light");
          root.style.colorScheme = "dark";
        } else {
          root.classList.remove("dark");
          root.classList.add("light");
          root.style.colorScheme = "light";
        }
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (e) {
      console.warn("Could not save theme to localStorage", e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, systemTheme: resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
