import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeState } from "../types";

interface AppStore {
  /** Appearance is the only client-owned preference; business settings live on the server. */
  theme: ThemeState;
  setTheme: (theme: ThemeState) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
    }),
    {
      name: "spark-clean-theme",
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
