export type FontScale = 'sm' | 'md' | 'lg';

export type PrimaryPreset = {
  id: string;
  label: string;
  color: string;   // main hex, e.g. '#7c3aed'
  r: number; g: number; b: number;
  light: string;   // lighter variant (for chips, text on dark)
  dark: string;    // darker variant (for text on light bg)
};

export const PRIMARY_PRESETS: PrimaryPreset[] = [
  { id: 'violet',  label: 'Violet',  color: '#7c3aed', r: 124, g: 58,  b: 237, light: '#a78bfa', dark: '#6d28d9' },
  { id: 'blue',    label: 'Blue',    color: '#2563eb', r: 37,  g: 99,  b: 235, light: '#93c5fd', dark: '#1d4ed8' },
  { id: 'sky',     label: 'Sky',     color: '#0284c7', r: 2,   g: 132, b: 199, light: '#7dd3fc', dark: '#0369a1' },
  { id: 'teal',    label: 'Teal',    color: '#0d9488', r: 13,  g: 148, b: 136, light: '#5eead4', dark: '#0f766e' },
  { id: 'emerald', label: 'Emerald', color: '#059669', r: 5,   g: 150, b: 105, light: '#6ee7b7', dark: '#047857' },
  { id: 'green',   label: 'Green',   color: '#16a34a', r: 22,  g: 163, b: 74,  light: '#86efac', dark: '#15803d' },
  { id: 'amber',   label: 'Amber',   color: '#d97706', r: 217, g: 119, b: 6,   light: '#fcd34d', dark: '#b45309' },
  { id: 'orange',  label: 'Orange',  color: '#ea580c', r: 234, g: 88,  b: 12,  light: '#fb923c', dark: '#c2410c' },
  { id: 'rose',    label: 'Rose',    color: '#e11d48', r: 225, g: 29,  b: 72,  light: '#fb7185', dark: '#be123c' },
  { id: 'pink',    label: 'Pink',    color: '#db2777', r: 219, g: 39,  b: 119, light: '#f472b6', dark: '#be185d' },
  { id: 'red',     label: 'Red',     color: '#dc2626', r: 220, g: 38,  b: 38,  light: '#fca5a5', dark: '#b91c1c' },
  { id: 'slate',   label: 'Slate',   color: '#475569', r: 71,  g: 85,  b: 105, light: '#94a3b8', dark: '#334155' },
];

export const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: 'sm', label: 'Small'  },
  { value: 'md', label: 'Normal' },
  { value: 'lg', label: 'Large'  },
];

export const FONT_ZOOM: Record<FontScale, number> = { sm: 0.9, md: 1.0, lg: 1.1 };

/** Generate a CSS `:root { ... }` variable block from a preset. */
export function buildCssVars(p: PrimaryPreset): string {
  const rgb = `${p.r},${p.g},${p.b}`;
  return [
    `--primary:${p.color}`,
    `--primary-light:${p.light}`,
    `--primary-dark:${p.dark}`,
    `--primary-08:rgba(${rgb},0.08)`,
    `--primary-10:rgba(${rgb},0.10)`,
    `--primary-12:rgba(${rgb},0.12)`,
    `--primary-15:rgba(${rgb},0.15)`,
    `--primary-18:rgba(${rgb},0.18)`,
    `--primary-20:rgba(${rgb},0.20)`,
    `--primary-22:rgba(${rgb},0.22)`,
    `--primary-30:rgba(${rgb},0.30)`,
    `--primary-35:rgba(${rgb},0.35)`,
    `--primary-40:rgba(${rgb},0.40)`,
  ].join(';');
}
