import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WorkspaceState {
  codeCache: Record<string, string>;
  setCode: (questionId: string, language: string, code: string) => void;
  getCode: (questionId: string, language: string, fallback: string) => string;
  clearCache: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      codeCache: {},

      setCode: (questionId, language, code) => {
        const key = `${questionId}_${language}`;
        set((state) => ({
          codeCache: { ...state.codeCache, [key]: code },
        }));
      },

      getCode: (questionId, language, fallback) => {
        const key = `${questionId}_${language}`;
        return get().codeCache[key] || fallback;
      },

      clearCache: () => set({ codeCache: {} }),
    }),
    {
      name: "leetcode-code-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
