import type { Activity } from './content.ts';
import { IMAGE_WIDTH, svgDocument, textElement, widthOf } from './svg.ts';
import { PALETTES, type Palette, type Theme } from './theme.ts';

const PADDING = 32;
const VALUE_SIZE = 28;
const LABEL_SIZE = 12;
const BAR_HEIGHT = 12;
/**
 * Touching segments are told apart by a gap in the colour of the surface, never by an outline:
 * wide enough to survive when a phone shows the card at less than half its size.
 */
const SEGMENT_GAP = 4;
const LEGEND_SIZE = 12;
const LEGEND_GAP = 22;
const SWATCH = 10;

const figures = new Intl.NumberFormat('en-US');
const shares = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export interface Figure {
  value: string;
  /** What is counted, and below it which ones: together they read as one phrase. */
  label: string;
  detail: string;
}

/** A figure as a phrase, such as `1,677 contributions in the last year`. */
export const phraseOf = ({ value, label, detail }: Figure) => `${value} ${label} ${detail}`;

/** The headline figures: what was contributed, for how long in a row, and what is public. */
export function figuresOf(activity: Activity): Figure[] {
  const firstYear = activity.allTime?.years[0]?.year;
  return [
    {
      value: figures.format(activity.totalContributions),
      label: 'contributions',
      detail: 'in the last year',
    },
    ...(activity.allTime === null
      ? []
      : [
          {
            value: figures.format(activity.allTime.contributions),
            label: 'contributions',
            detail: firstYear === undefined ? 'in total' : `since ${firstYear}`,
          },
        ]),
    {
      value: figures.format(activity.longestStreak.days),
      label: 'days',
      detail: 'in the longest streak',
    },
    {
      value: figures.format(activity.publicRepositories),
      label: 'public repositories',
      detail: 'on GitHub',
    },
  ];
}

export interface LanguageShare {
  name: string;
  percentage: number;
  /** Its place among the chart colours; null for what is left, which wears a neutral. */
  slot: 0 | 1 | 2 | 3 | null;
}

const SLOTS = [0, 1, 2, 3] as const;
/** Below this a language would be a sliver nobody can read. */
const MIN_SHARE = 1;

/**
 * The four languages with the most code, largest first, each with a colour of its own, and the
 * rest together: more colours than that could not be told apart.
 */
export function languageSharesOf(activity: Activity): LanguageShare[] {
  const sorted = [...activity.topTechnologies].sort(
    (first, second) => second.percentage - first.percentage,
  );
  const named = SLOTS.flatMap((slot) => {
    const share = sorted[slot];
    return share !== undefined && share.percentage >= MIN_SHARE
      ? [{ name: share.technology.name, percentage: share.percentage, slot }]
      : [];
  });
  if (named.length === 0) return [];
  const rest = 100 - named.reduce((total, share) => total + share.percentage, 0);
  return rest >= MIN_SHARE
    ? [...named, { name: 'Other', percentage: Math.round(rest * 10) / 10, slot: null }]
    : named;
}

const colorOf = (share: LanguageShare, palette: Palette) =>
  share.slot === null ? palette.border : palette.chart[share.slot];

function drawFigures(list: readonly Figure[], palette: Palette, y: number): string {
  const column = (IMAGE_WIDTH - 2 * PADDING) / list.length;
  return list
    .map(({ value, label, detail }, index) => {
      const x = PADDING + column * (index + 0.5);
      const line = { x, fontSize: LABEL_SIZE, anchor: 'middle' as const };
      return (
        textElement(value, {
          x,
          y,
          fontSize: VALUE_SIZE,
          fill: palette.text,
          bold: true,
          anchor: 'middle',
        }) +
        textElement(label, { ...line, y: y + 30, fill: palette.text }) +
        textElement(detail, { ...line, y: y + 48, fill: palette.textMuted })
      );
    })
    .join('');
}

function drawBar(list: readonly LanguageShare[], palette: Palette, y: number): string {
  const width = IMAGE_WIDTH - 2 * PADDING;
  const total = list.reduce((sum, share) => sum + share.percentage, 0);
  let x = PADDING;
  const segments = list.map((share, index) => {
    const segment = (share.percentage / total) * width;
    const left = x;
    x += segment;
    const gap = index === list.length - 1 ? 0 : SEGMENT_GAP;
    return `<rect x="${left.toFixed(1)}" y="${y}" width="${Math.max(1, segment - gap).toFixed(1)}" height="${BAR_HEIGHT}" fill="${colorOf(share, palette)}"/>`;
  });
  return (
    `<clipPath id="bar"><rect x="${PADDING}" y="${y}" width="${width}" height="${BAR_HEIGHT}" rx="4"/></clipPath>` +
    `<g clip-path="url(#bar)">${segments.join('')}</g>`
  );
}

/** One line, centred: a swatch, the name and the share of each language, in the order of the bar. */
function drawLegend(list: readonly LanguageShare[], palette: Palette, y: number): string {
  const entries = list.map((share) => {
    const text = `${share.name} ${shares.format(share.percentage)}%`;
    return { share, text, width: SWATCH + 7 + widthOf(text, LEGEND_SIZE) };
  });
  const total =
    entries.reduce((sum, entry) => sum + entry.width, 0) + (entries.length - 1) * LEGEND_GAP;
  let x = (IMAGE_WIDTH - total) / 2;
  return entries
    .map(({ share, text, width }) => {
      const left = x;
      x += width + LEGEND_GAP;
      return (
        `<rect x="${left.toFixed(1)}" y="${y - SWATCH / 2}" width="${SWATCH}" height="${SWATCH}" rx="2" fill="${colorOf(share, palette)}"/>` +
        // Text wears the colour of text: the swatch next to it carries the identity.
        textElement(text, {
          x: Math.round(left + SWATCH + 7),
          y,
          fontSize: LEGEND_SIZE,
          fill: palette.text,
        })
      );
    })
    .join('');
}

/** The card in words, for whoever cannot see it. */
export function describeActivity(activity: Activity): string {
  const languages = languageSharesOf(activity);
  return [
    figuresOf(activity).map(phraseOf).join(', '),
    ...(languages.length === 0
      ? []
      : [
          `Languages: ${languages.map((share) => `${share.name} ${shares.format(share.percentage)}%`).join(', ')}`,
        ]),
  ].join('. ');
}

/**
 * The figures of GitHub on one card, and below them how the code of the owner's repositories
 * is shared among languages.
 */
export function renderActivity(activity: Activity, theme: Theme): string {
  const palette = PALETTES[theme];
  const list = figuresOf(activity);
  const languages = languageSharesOf(activity);
  const height = languages.length === 0 ? 132 : 212;

  return svgDocument(
    { width: IMAGE_WIDTH, height, description: describeActivity(activity) },
    `<rect x="0.5" y="0.5" width="${IMAGE_WIDTH - 1}" height="${height - 1}" rx="13.5" fill="${palette.surface}" stroke="${palette.border}" stroke-opacity="0.6"/>` +
      drawFigures(list, palette, 46) +
      (languages.length === 0
        ? ''
        : drawBar(languages, palette, 138) + drawLegend(languages, palette, 178)),
  );
}
