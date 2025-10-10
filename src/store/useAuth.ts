import { create } from "zustand";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type AuthState = {
  user: SupabaseUser | null;
  loading: boolean;
  setUser: (user: SupabaseUser | null) => void;
  fetchUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  fetchUser: async () => {
    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
