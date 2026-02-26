import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LangCode, PageId, ThemeTokens } from '../types';
import { darkTheme, lightTheme } from '../constants/themes';
import { translations, type Translations } from '../constants/translations';
import { type Currency, CURRENCIES } from '../constants/currencies';
import { PRIMARY_PRESETS, type FontScale } from '../constants/primaryPresets';

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

  // ── Currency ─────────────────────────────────────────────────
  currency: Currency;
  setCurrency: (c: Currency) => void;

  // ── Appearance ────────────────────────────────────────────────
  primaryPresetId: string;
  setPrimaryPresetId: (id: string) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;

  // ── Inventory ─────────────────────────────────────────────────
  lowStockThreshold: number;
  setLowStockThreshold: (n: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
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

      // ── Currency ───────────────────────────────────────────────
      currency: CURRENCIES[0], // default: THB ฿
      setCurrency: (currency) => set({ currency }),

      // ── Appearance ─────────────────────────────────────────────
      primaryPresetId: 'violet',
      setPrimaryPresetId: (primaryPresetId) => set({ primaryPresetId }),
      fontScale: 'md' as FontScale,
      setFontScale: (fontScale) => set({ fontScale }),

      // ── Inventory ──────────────────────────────────────────────
      lowStockThreshold: 10,
      setLowStockThreshold: (lowStockThreshold) => set({ lowStockThreshold }),
    }),
    {
      name: 'mkpos-app-store',
      // Persist theme, lang, currency, and inventory preferences — not nav state
      partialize: (s) => ({ isDark: s.isDark, lang: s.lang, currency: s.currency, lowStockThreshold: s.lowStockThreshold, primaryPresetId: s.primaryPresetId, fontScale: s.fontScale }),
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
export const useTheme         = () => useAppStore((s) => s.theme);
export const useTr            = () => useAppStore((s) => s.tr);
export const useIsDark        = () => useAppStore((s) => s.isDark);
export const usePage          = () => useAppStore((s) => s.page);
export const useLang          = () => useAppStore((s) => s.lang);
export const useCurrency      = () => useAppStore((s) => s.currency);
export const usePrimaryPreset = () => {
  const id = useAppStore((s) => s.primaryPresetId);
  return PRIMARY_PRESETS.find((p) => p.id === id) ?? PRIMARY_PRESETS[0];
};
export const useFontScale     = () => useAppStore((s) => s.fontScale);
