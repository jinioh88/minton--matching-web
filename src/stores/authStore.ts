import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types/user";

export type { User };

/** SSR 시 localStorage 미존재로 인한 에러 방지 */
const safeStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // ignore
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

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
    { name: "auth-storage", storage: createJSONStorage(() => safeStorage) }
  )
);
