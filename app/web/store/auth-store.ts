"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  userId: string | null;
  userName: string;
  isAuthenticated: boolean;
  signIn: (userId: string, name: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      userName: "",
      isAuthenticated: false,

      signIn: (userId, userName) =>
        set({ userId, userName, isAuthenticated: true }),

      signOut: () =>
        set({ userId: null, userName: "", isAuthenticated: false }),
    }),
    { name: "sufra-auth" }
  )
);
