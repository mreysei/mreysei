/**
 * The colours of the images, taken from the two default themes of the portfolio (`abyss` and
 * `parchment` in `docs/THEMES.md` of the platform's workspace repository): GitHub shows the one
 * that matches the reader's colour scheme.
 */
export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

export interface Palette {
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Code colours of the terminal: the prompt, what is typed and what is answered. */
  keyword: string;
  string: string;
  property: string;
  /**
   * Chart series, in this fixed order: the first four of the portfolio's own, which stay apart
   * on the surface for the common colour vision deficiencies (checked with a palette validator).
   */
  chart: readonly [string, string, string, string];
}

export const PALETTES: Readonly<Record<Theme, Palette>> = {
  dark: {
    surface: '#17122a',
    surfaceRaised: '#211a3a',
    border: '#6f6492',
    text: '#f1ecf7',
    textMuted: '#b3aac8',
    accent: '#a79bff',
    keyword: '#f38bd8',
    string: '#a6e3a1',
    property: '#8ecbff',
    chart: ['#3987e5', '#d95926', '#199e70', '#c98500'],
  },
  light: {
    surface: '#ffffff',
    surfaceRaised: '#f2ebdf',
    border: '#8b8298',
    text: '#1d1a23',
    textMuted: '#5a5468',
    accent: '#5433e0',
    keyword: '#9a1b7c',
    string: '#2f6b22',
    property: '#1d5fa8',
    chart: ['#2a78d6', '#d9480f', '#0f8a64', '#c2379a'],
  },
};

/** The violet of the logo, with white on it (5.77:1), and the ink of the tile behind the logo. */
export const BRAND = {
  violet: '#6342f6',
  onViolet: '#ffffff',
  ink: '#0d0a14',
  onInk: '#f1ecf7',
} as const;

function channelOf(hex: string, at: number): number {
  const value = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminanceOf(hex: string): number {
  return 0.2126 * channelOf(hex, 1) + 0.7152 * channelOf(hex, 3) + 0.0722 * channelOf(hex, 5);
}

/** WCAG contrast ratio of two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminanceOf(first), luminanceOf(second)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** What a shape that carries no text needs to be told apart from what is behind it. */
const GRAPHIC_CONTRAST = 3;

/**
 * A brand colour when it stands out on the background, the fallback otherwise: brand colours
 * are never chosen for contrast, and a black logo on a dark surface would not be seen.
 */
export function readableColor(color: string | null, background: string, fallback: string): string {
  return color !== null && contrastRatio(color, background) >= GRAPHIC_CONTRAST ? color : fallback;
}
