import { useState, useEffect, ReactNode, createContext, useContext } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export const ThemeContext = createContext<{
  isDark: boolean;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const preferences = useUserPreferences();

  useEffect(() => {
    // Use user preference if available, otherwise use localStorage/system preference
    if (preferences.darkMode !== undefined) {
      setIsDark(preferences.darkMode);
    } else {
      const saved = localStorage.getItem("theme");
      if (saved) {
        setIsDark(saved === "dark");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDark(prefersDark);
      }
    }
  }, [preferences.darkMode]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
