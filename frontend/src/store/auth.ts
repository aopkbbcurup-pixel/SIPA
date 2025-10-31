import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, setAuthToken } from "../lib/api";
import type { LoginRequest, LoginResponse } from "../types/auth";
import type { User } from "../types/report";
import { isAxiosError } from "axios";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error?: string;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: undefined,
      login: async (credentials) => {
        set({ isLoading: true, error: undefined });
        try {
          const { data } = await api.post<LoginResponse>("/auth/login", credentials);
          setAuthToken(data.token);
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (error) {
          setAuthToken(null);
          let message = "Gagal login";
          if (isAxiosError(error)) {
            message = error.response?.data?.message ?? error.message;
          } else if (error instanceof Error) {
            message = error.message;
          }
          set({ user: null, token: null, isLoading: false, error: message });
          throw error;
        }
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, error: undefined });
      },
    }),
    {
      name: "sipa-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      },
    },
  ),
);
