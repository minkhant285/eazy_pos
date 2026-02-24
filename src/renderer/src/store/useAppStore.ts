import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LangCode, PageId, ThemeTokens } from '../types';
import { darkTheme, lightTheme } from '../constants/themes';
import { translations, type Translations } from '../constants/translations';

interface AppState {
  // ── Nav ──────────────────────────────────────────────────────
  page: PageId;
  sidebarCollapsed: boolean;
  setPage: (page: PageId) => void;
  setSidebarCollapsed: (v: boolean) => void;

  // ── Theme ────────────────────────────────────────────────────
  isDark: boolean;
  toggleTheme: () => void;
  theme: ThemeTokens;

  // ── Language ─────────────────────────────────────────────────
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  tr: Translations;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Nav ────────────────────────────────────────────────────
      page: 'dashboard',
      sidebarCollapsed: false,
      setPage: (page) => set({ page }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      // ── Theme ──────────────────────────────────────────────────
      isDark: true,
      theme: darkTheme,
      toggleTheme: () =>
        set((s) => ({
          isDark: !s.isDark,
          theme: s.isDark ? lightTheme : darkTheme,
        })),

      // ── Language ───────────────────────────────────────────────
      lang: 'en',
      tr: translations.en,
      setLang: (lang) => set({ lang, tr: translations[lang] }),
    }),
    {
      name: 'mkpos-app-store',
      // Only persist theme & lang preferences — not nav state
      partialize: (s) => ({ isDark: s.isDark, lang: s.lang }),
      // Rehydrate derived fields after persist load
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.theme = state.isDark ? darkTheme : lightTheme;
          state.tr = translations[state.lang];
        }
      },
    }
  )
);

// ── Convenience selectors ─────────────────────────────────────
export const useTheme  = () => useAppStore((s) => s.theme);
export const useTr     = () => useAppStore((s) => s.tr);
export const useIsDark = () => useAppStore((s) => s.isDark);
export const usePage   = () => useAppStore((s) => s.page);
export const useLang   = () => useAppStore((s) => s.lang);
