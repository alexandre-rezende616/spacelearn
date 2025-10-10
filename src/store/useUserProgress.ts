// zustand store pra progresso do usuario
import { create } from "zustand";
import { persist } from "zustand/middleware";

// shape do estado global e as acoes
type UserProgress = {
  coins: number;
  xp: number;
  streak: number;
  completedLessons: string[];
  addCoins: (amount: number) => void;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
  completeLesson: (id: string) => void;
  resetProgress: () => void;
};

// persiste no storage local com a chave abaixo
export const useUserProgress = create<UserProgress>()(
  persist(
    (set) => ({
      coins: 0,
      xp: 0,
      streak: 0,
      completedLessons: [],
      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
      addXP: (amount) => set((state) => ({ xp: state.xp + amount })),
      incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),
      completeLesson: (id) =>
        set((state) =>
          state.completedLessons.includes(id)
            ? state
            : { completedLessons: [...state.completedLessons, id] }
        ),
      resetProgress: () => set({ coins: 0, xp: 0, streak: 0, completedLessons: [] }),
    }),
    { name: "spacelearn-user-progress" } // salva localmente (AsyncStorage)
  )
);
