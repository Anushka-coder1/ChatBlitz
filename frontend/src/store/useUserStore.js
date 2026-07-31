import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user, token) =>
        set((state) => ({
          user,
          token: token || state.token,
          isAuthenticated: true,
        })),
      clearUser: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "chatblitz-user-storage",
    },
  ),
);
