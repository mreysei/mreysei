import type { StackTechnology } from './content.ts';
import { iconElement, IMAGE_WIDTH, svgDocument, textElement, widthOf } from './svg.ts';
import { PALETTES, readableColor, type Theme } from './theme.ts';

const CARD_HEIGHT = 48;
const PADDING = 12;
const ICON = 16;
const ICON_GAP = 8;
const GAP = 8;
const NAME_SIZE = 13;
const EXPERIENCE_SIZE = 11;
const MONTHS_IN_A_YEAR = 12;

/** About how long, in English: months under a year, then whole years. */
export function experienceOf(months: number): string {
  if (months < MONTHS_IN_A_YEAR) return months === 1 ? '1 month' : `${months} months`;
  const years = Math.round(months / MONTHS_IN_A_YEAR);
  return years === 1 ? '1 year' : `${years} years`;
}

/** The longest used first; the order of the portfolio among equals. */
function byExperience(technologies: readonly StackTechnology[]): StackTechnology[] {
  return [...technologies].sort((first, second) => second.months - first.months);
}

/** Read instead of the image, and in the same order. */
export function describeStack(technologies: readonly StackTechnology[]): string {
  return byExperience(technologies)
    .map((technology) => `${technology.name}: ${experienceOf(technology.months)}`)
    .join(', ');
}

interface Card {
  technology: StackTechnology;
  experience: string;
  width: number;
}

function cardOf(technology: StackTechnology): Card {
  const experience = experienceOf(technology.months);
  const icon = technology.iconPath === null ? 0 : ICON + ICON_GAP;
  const texts = Math.max(widthOf(technology.name, NAME_SIZE), widthOf(experience, EXPERIENCE_SIZE));
  return { technology, experience, width: PADDING + icon + texts + PADDING };
}

/** As many cards per row as fit, in their order. */
function rowsOf(cards: readonly Card[]): Card[][] {
  const rows: Card[][] = [];
  let row: Card[] = [];
  let used = 0;
  for (const card of cards) {
    if (row.length > 0 && used + GAP + card.width > IMAGE_WIDTH) {
      rows.push(row);
      row = [];
      used = 0;
    }
    used += (row.length > 0 ? GAP : 0) + card.width;
    row.push(card);
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

interface Tone {
  background: string;
  ink: string;
}

/** The card on one tone: its shape, its logo where it stands out, its name and how long. */
function cardIn(card: Card, left: number, top: number, tone: Tone, border: string): string {
  const { technology, experience, width } = card;
  const { iconPath } = technology;
  const textLeft = left + PADDING + (iconPath === null ? 0 : ICON + ICON_GAP);
  return (
    `<rect x="${left + 0.5}" y="${top + 0.5}" width="${width - 1}" height="${CARD_HEIGHT - 1}" rx="8" fill="${tone.background}" stroke="${border}" stroke-opacity="0.5"/>` +
    (iconPath === null
      ? ''
      : iconElement(
          iconPath,
          { x: left + PADDING, y: top + (CARD_HEIGHT - ICON) / 2, size: ICON },
          readableColor(technology.color, tone.background, tone.ink),
        )) +
    textElement(technology.name, {
      x: textLeft,
      y: top + 17,
      fontSize: NAME_SIZE,
      fill: tone.ink,
      bold: true,
    }) +
    textElement(experience, { x: textLeft, y: top + 32, fontSize: EXPERIENCE_SIZE, fill: tone.ink })
  );
}

/**
 * The stack as cards, centred row by row, the longest used first. Each card is a bar of how long
 * against the rest: the one used longest is all accent, the one used least all surface, and every
 * other one is filled with the accent from the left in proportion. Over the accent the card is
 * drawn again in its own ink, so every text keeps its contrast on whichever tone it stands.
 */
export function renderStack(technologies: readonly StackTechnology[], theme: Theme): string {
  const palette = PALETTES[theme];
  const empty: Tone = { background: palette.surfaceRaised, ink: palette.text };
  const full: Tone = { background: palette.accent, ink: palette.surface };
  const sorted = byExperience(technologies);
  const months = sorted.map((technology) => technology.months);
  const least = Math.min(...months);
  const most = Math.max(...months);
  const rows = rowsOf(sorted.map(cardOf));
  const height = Math.max(CARD_HEIGHT, rows.length * (CARD_HEIGHT + GAP) - GAP);
  let index = 0;

  const drawn = rows.flatMap((row, rowIndex) => {
    const rowWidth = row.reduce((total, card) => total + card.width, 0) + (row.length - 1) * GAP;
    const top = rowIndex * (CARD_HEIGHT + GAP);
    let left = (IMAGE_WIDTH - rowWidth) / 2;
    return row.map((card) => {
      const x = left;
      left += card.width + GAP;
      const share = most === least ? 1 : (card.technology.months - least) / (most - least);
      const filled = Math.round(card.width * share);
      if (filled >= card.width) return cardIn(card, x, top, full, palette.border);
      if (filled <= 0) return cardIn(card, x, top, empty, palette.border);
      const clip = `fill${index++}`;
      return (
        cardIn(card, x, top, empty, palette.border) +
        `<clipPath id="${clip}"><rect x="${x}" y="${top}" width="${filled}" height="${CARD_HEIGHT}"/></clipPath>` +
        `<g clip-path="url(#${clip})">${cardIn(card, x, top, full, palette.border)}</g>`
      );
    });
  });

  return svgDocument(
    { width: IMAGE_WIDTH, height, description: describeStack(technologies) },
    drawn.join(''),
  );
}
