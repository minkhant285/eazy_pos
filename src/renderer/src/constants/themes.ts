import type { ThemeTokens } from '../types';

export const darkTheme: ThemeTokens = {
  bg: '#080a0f', surface: '#0f1117', surfaceHover: 'rgba(255,255,255,0.025)',
  border: 'rgba(255,255,255,0.07)', borderMid: 'rgba(255,255,255,0.055)', borderStrong: 'rgba(255,255,255,0.12)',
  text: '#f1f2f5', textMuted: 'rgba(255,255,255,0.45)', textFaint: 'rgba(255,255,255,0.22)', textSubtle: 'rgba(255,255,255,0.62)',
  inputBg: 'rgba(255,255,255,0.04)', inputBorder: 'rgba(255,255,255,0.09)',
  activeNav: 'rgba(139,92,246,0.18)', activeNavText: '#c4b5fd', activeNavDot: '#a78bfa',
  navText: 'rgba(255,255,255,0.38)', groupLabel: 'rgba(255,255,255,0.2)',
  divider: 'rgba(255,255,255,0.08)', scrollThumb: 'rgba(255,255,255,0.08)',
};

export const lightTheme: ThemeTokens = {
  bg: '#f1f3f6', surface: '#ffffff', surfaceHover: 'rgba(0,0,0,0.02)',
  border: 'rgba(0,0,0,0.08)', borderMid: 'rgba(0,0,0,0.06)', borderStrong: 'rgba(0,0,0,0.13)',
  text: '#111318', textMuted: 'rgba(0,0,0,0.48)', textFaint: 'rgba(0,0,0,0.28)', textSubtle: 'rgba(0,0,0,0.62)',
  inputBg: 'rgba(0,0,0,0.035)', inputBorder: 'rgba(0,0,0,0.10)',
  activeNav: 'rgba(124,58,237,0.1)', activeNavText: '#6d28d9', activeNavDot: '#7c3aed',
  navText: 'rgba(0,0,0,0.42)', groupLabel: 'rgba(0,0,0,0.3)',
  divider: 'rgba(0,0,0,0.08)', scrollThumb: 'rgba(0,0,0,0.12)',
};
