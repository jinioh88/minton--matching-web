import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";

export type { User };

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null, accessToken: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        if (typeof window !== "undefined" && accessToken) {
          localStorage.setItem("accessToken", accessToken);
        }
        set({
          user,
          accessToken,
          isAuthenticated: !!user && !!accessToken,
        });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    { name: "auth-storage" }
  )
);
