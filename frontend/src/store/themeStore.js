import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(theme);
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const nextTheme = state.theme === "dark" ? "light" : "dark";
          document.documentElement.classList.remove("dark", "light");
          document.documentElement.classList.add(nextTheme);
          return { theme: nextTheme };
        }),
    }),
    {
      name: "chatblitz-theme-storage",
      onRehydrateStorage: () => (state) => {
        const theme = state?.theme || "dark";
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(theme);
      },
    },
  ),
);
