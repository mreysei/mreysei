import type { ProfileContent } from './content.ts';
import { logoElement } from './logo.ts';
import { fit, IMAGE_WIDTH, pictureElement, svgDocument, textElement, wrap } from './svg.ts';
import { BRAND, PALETTES, type Palette, type Theme } from './theme.ts';

/** The pictures of the hero, as `data:` addresses; null for one the profile has not got. */
export interface HeroPictures {
  avatar: string | null;
  banner: string | null;
}

const BANNER_HEIGHT = 230;
/** The banner dissolves into the page through a screen of dots, as on the home page. */
const HALFTONE_TOP = 118;
const HALFTONE_STEP = 8;
const AVATAR = 150;
const AVATAR_TOP = 148;
const NAME_SIZE = 68;
/** The role and the headline stay readable when a phone shows the hero at less than half. */
const ROLE_SIZE = 26;
const HEADLINE_SIZE = 22;
const HEADLINE_LINE = 32;
const HEADLINE_WIDTH = 720;
const TEXT_WIDTH = IMAGE_WIDTH - 80;
const GRID = 18;

/**
 * One moment: the photo and the words under it settle in, one after the other, within a second.
 * The image reads whole where animations do not run, and for whoever asked for less motion.
 */
const STYLES =
  '.in{animation:in .6s cubic-bezier(.2,.7,.2,1) backwards}' +
  '@keyframes in{from{opacity:0;transform:translateY(10px)}}' +
  '@media (prefers-reduced-motion:reduce){.in{animation:none}}';

const roleAndPlace = ({ profile }: ProfileContent) =>
  [profile.role, profile.location].filter((part) => part !== '').join(' · ');

const withoutEnd = (sentence: string) => sentence.replace(/[.\s]+$/, '');

/** Everything the hero shows, in words, for whoever cannot see it. */
export function describeBanner(content: ProfileContent): string {
  return [
    [content.profile.name, roleAndPlace(content)].filter((part) => part !== '').join(' — '),
    content.profile.headline,
  ]
    .map(withoutEnd)
    .filter((sentence) => sentence !== '')
    .map((sentence) => `${sentence}.`)
    .join(' ');
}

/**
 * Rows of dots in the colour of the page, larger row after row until they touch, and under the
 * last rows the page itself fading in: the banner dissolves into the ground.
 */
function halftone(palette: Palette): string {
  const rows = (BANNER_HEIGHT - HALFTONE_TOP) / HALFTONE_STEP;
  const parts: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    const y = HALFTONE_TOP + row * HALFTONE_STEP;
    // A dot never outgrows its cell: cut by it, it would be a square, not a dot.
    const radius = (0.5 + (row / (rows - 1)) * (HALFTONE_STEP / 2 - 0.5)).toFixed(2);
    // Every other row moves half a step, as the dots of a print do.
    const shift = row % 2 === 0 ? 0 : HALFTONE_STEP / 2;
    parts.push(
      `<pattern id="dots${row}" x="${shift}" y="${y}" width="${HALFTONE_STEP}" height="${HALFTONE_STEP}" patternUnits="userSpaceOnUse">` +
        `<circle cx="${HALFTONE_STEP / 2}" cy="${HALFTONE_STEP / 2}" r="${radius}" fill="${palette.surface}"/></pattern>` +
        `<rect y="${y}" width="${IMAGE_WIDTH}" height="${HALFTONE_STEP}" fill="url(#dots${row})"/>`,
    );
  }
  const fadeTop = BANNER_HEIGHT - 5 * HALFTONE_STEP;
  return (
    parts.join('') +
    `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.surface}" stop-opacity="0"/><stop offset="1" stop-color="${palette.surface}"/></linearGradient>` +
    `<rect y="${fadeTop}" width="${IMAGE_WIDTH}" height="${BANNER_HEIGHT - fadeTop + 1}" fill="url(#fade)"/>`
  );
}

/** The faint grid of dots of every page of the portfolio, the owner's mark. */
function dotGrid(palette: Palette, height: number): string {
  return (
    `<pattern id="grid" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse">` +
    `<circle cx="${GRID / 2}" cy="${GRID / 2}" r="1.1" fill="${palette.textMuted}" fill-opacity="0.28"/></pattern>` +
    `<rect y="${BANNER_HEIGHT}" width="${IMAGE_WIDTH}" height="${height - BANNER_HEIGHT}" fill="url(#grid)"/>`
  );
}

/** The photo on a frame of the accent, lit from behind; the logo on its tile without one. */
function portrait(avatar: string | null, palette: Palette): string {
  const x = (IMAGE_WIDTH - AVATAR) / 2;
  const box = { x, y: AVATAR_TOP, width: AVATAR, height: AVATAR };
  const inner = avatar === null ? logoElement(x + 14, AVATAR_TOP + 14, AVATAR - 28) : '';
  return (
    `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>` +
    `<clipPath id="photo"><rect x="${x}" y="${AVATAR_TOP}" width="${AVATAR}" height="${AVATAR}" rx="26"/></clipPath>` +
    `<g class="in">` +
    `<rect x="${x}" y="${AVATAR_TOP}" width="${AVATAR}" height="${AVATAR}" rx="26" fill="${palette.accent}" fill-opacity="0.55" filter="url(#glow)"/>` +
    `<rect x="${x}" y="${AVATAR_TOP}" width="${AVATAR}" height="${AVATAR}" rx="26" fill="${BRAND.ink}"/>` +
    (avatar === null ? inner : `<g clip-path="url(#photo)">${pictureElement(avatar, box)}</g>`) +
    `<rect x="${x - 2.5}" y="${AVATAR_TOP - 2.5}" width="${AVATAR + 5}" height="${AVATAR + 5}" rx="28" fill="none" stroke="${palette.accent}" stroke-width="5"/>` +
    `</g>`
  );
}

/** The largest size, up to the one of the home page, at which the name fits on one line. */
function nameSize(name: string): number {
  let size = NAME_SIZE;
  while (size > 32 && fit(name, TEXT_WIDTH, size) !== name) size -= 2;
  return size;
}

const delay = (seconds: number) => `animation-delay:${seconds.toFixed(2)}s`;

/**
 * The header of the profile, drawn as the hero of the home page of the portfolio: the banner
 * dissolving into dots, the photo framed in the accent, the name written large, the role in the
 * accent and the headline under it, on the grid of dots.
 */
export function renderBanner(
  content: ProfileContent,
  theme: Theme,
  pictures: HeroPictures,
): string {
  const palette = PALETTES[theme];
  const { profile } = content;
  const center = IMAGE_WIDTH / 2;
  const size = nameSize(profile.name);
  const nameY = AVATAR_TOP + AVATAR + 24 + size / 2;
  const roleY = nameY + size / 2 + 30;
  const role = roleAndPlace(content);
  const headline =
    profile.headline === '' ? [] : wrap(profile.headline, HEADLINE_WIDTH, HEADLINE_SIZE, 2);
  const headlineY = (role === '' ? nameY + size / 2 : roleY + 18) + HEADLINE_LINE;
  const height = headlineY + Math.max(0, headline.length - 1) * HEADLINE_LINE + 44;

  const words = [
    textElement(fit(profile.name, TEXT_WIDTH, size), {
      x: center,
      y: nameY,
      fontSize: size,
      fill: palette.text,
      weight: 800,
      sans: true,
      anchor: 'middle',
      className: 'in',
      style: delay(0.15),
    }),
    ...(role === ''
      ? []
      : [
          textElement(fit(role, TEXT_WIDTH, ROLE_SIZE), {
            x: center,
            y: roleY,
            fontSize: ROLE_SIZE,
            fill: palette.accent,
            bold: true,
            sans: true,
            anchor: 'middle',
            className: 'in',
            style: delay(0.3),
          }),
        ]),
    ...headline.map((line, index) =>
      textElement(line, {
        x: center,
        y: headlineY + index * HEADLINE_LINE,
        fontSize: HEADLINE_SIZE,
        fill: palette.textMuted,
        sans: true,
        anchor: 'middle',
        className: 'in',
        style: delay(0.45),
      }),
    ),
  ];

  return svgDocument(
    { width: IMAGE_WIDTH, height, description: describeBanner(content), styles: STYLES },
    `<clipPath id="card"><rect width="${IMAGE_WIDTH}" height="${height}" rx="18"/></clipPath>` +
      `<radialGradient id="light"><stop offset="0" stop-color="${BRAND.violet}" stop-opacity="0.32"/><stop offset="1" stop-color="${BRAND.violet}" stop-opacity="0"/></radialGradient>` +
      `<g clip-path="url(#card)">` +
      `<rect width="${IMAGE_WIDTH}" height="${height}" fill="${palette.surface}"/>` +
      (pictures.banner === null
        ? `<rect width="${IMAGE_WIDTH}" height="${BANNER_HEIGHT}" fill="${BRAND.violet}"/>`
        : pictureElement(pictures.banner, {
            x: 0,
            y: 0,
            width: IMAGE_WIDTH,
            height: BANNER_HEIGHT,
          })) +
      halftone(palette) +
      dotGrid(palette, height) +
      // The light behind the name, as on the home page.
      `<ellipse cx="${center}" cy="${nameY}" rx="380" ry="90" fill="url(#light)"/>` +
      `</g>` +
      portrait(pictures.avatar, palette) +
      words.join('') +
      `<rect x="0.5" y="0.5" width="${IMAGE_WIDTH - 1}" height="${height - 1}" rx="17.5" fill="none" stroke="${palette.border}" stroke-opacity="0.6"/>`,
  );
}
