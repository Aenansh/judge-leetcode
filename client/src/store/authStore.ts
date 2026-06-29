import { create } from "zustand";
import { authApi } from "../api/auth";
import type { LoginPayload, RegisterPayload, SessionUser } from "../api/auth";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

type AuthState = {
  user: SessionUser | null;
  status: AuthStatus;
  error: string | null;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  error: null,
  isAuthenticated: false,
  initialize: async () => {
    if (get().status !== "idle") {
      return;
    }

    set({ status: "loading", error: null });

    try {
      const { user } = await authApi.me();
      set({
        user,
        status: "authenticated",
        isAuthenticated: true,
        error: null,
      });
    } catch {
      set({
        user: null,
        status: "anonymous",
        isAuthenticated: false,
        error: null,
      });
    }
  },
  login: async (payload) => {
    set({ status: "loading", error: null });

    try {
      const { user } = await authApi.login(payload);
      set({
        user,
        status: "authenticated",
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to login.";
      set({
        user: null,
        status: "anonymous",
        isAuthenticated: false,
        error: message,
      });
      throw error;
    }
  },
  register: async (payload) => {
    set({ status: "loading", error: null });

    try {
      const { user } = await authApi.register(payload);
      set({
        user,
        status: "authenticated",
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to register.";
      set({
        user: null,
        status: "anonymous",
        isAuthenticated: false,
        error: message,
      });
      throw error;
    }
  },
  logout: async () => {
    set({ status: "loading", error: null });

    try {
      await authApi.logout();
    } finally {
      set({
        user: null,
        status: "anonymous",
        isAuthenticated: false,
        error: null,
      });
    }
  },
  clearError: () => set({ error: null }),
}));
