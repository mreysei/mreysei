import type { Technology } from './content.ts';
import { iconElement, IMAGE_WIDTH, svgDocument, textElement, widthOf } from './svg.ts';
import { PALETTES, readableColor, type Theme } from './theme.ts';

const CHIP_HEIGHT = 32;
const PADDING = 12;
const ICON = 16;
const ICON_GAP = 8;
const GAP = 8;
const FONT_SIZE = 13;

interface Chip {
  technology: Technology;
  width: number;
}

function chipOf(technology: Technology): Chip {
  const icon = technology.iconPath === null ? 0 : ICON + ICON_GAP;
  return { technology, width: PADDING + icon + widthOf(technology.name, FONT_SIZE) + PADDING };
}

/** As many chips per row as fit, in their order. */
function rowsOf(chips: readonly Chip[]): Chip[][] {
  const rows: Chip[][] = [];
  let row: Chip[] = [];
  let used = 0;
  for (const chip of chips) {
    if (row.length > 0 && used + GAP + chip.width > IMAGE_WIDTH) {
      rows.push(row);
      row = [];
      used = 0;
    }
    used += (row.length > 0 ? GAP : 0) + chip.width;
    row.push(chip);
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

/**
 * The technologies as a wall of chips, centred row by row. Each logo wears its brand colour
 * where it stands out on the chip; the name next to it is what says which one it is.
 */
export function renderStack(technologies: readonly Technology[], theme: Theme): string {
  const palette = PALETTES[theme];
  const rows = rowsOf(technologies.map(chipOf));
  const height = Math.max(CHIP_HEIGHT, rows.length * (CHIP_HEIGHT + GAP) - GAP);

  const drawn = rows.flatMap((row, rowIndex) => {
    const rowWidth = row.reduce((total, chip) => total + chip.width, 0) + (row.length - 1) * GAP;
    const y = rowIndex * (CHIP_HEIGHT + GAP);
    let x = (IMAGE_WIDTH - rowWidth) / 2;
    return row.map(({ technology, width }) => {
      const left = x;
      x += width + GAP;
      const { iconPath } = technology;
      return (
        `<rect x="${left + 0.5}" y="${y + 0.5}" width="${width - 1}" height="${CHIP_HEIGHT - 1}" rx="8" fill="${palette.surface}" stroke="${palette.border}" stroke-opacity="0.5"/>` +
        (iconPath === null
          ? ''
          : iconElement(
              iconPath,
              { x: left + PADDING, y: y + (CHIP_HEIGHT - ICON) / 2, size: ICON },
              readableColor(technology.color, palette.surface, palette.text),
            )) +
        textElement(technology.name, {
          x: left + PADDING + (iconPath === null ? 0 : ICON + ICON_GAP),
          y: y + CHIP_HEIGHT / 2,
          fontSize: FONT_SIZE,
          fill: palette.text,
        })
      );
    });
  });

  return svgDocument(
    {
      width: IMAGE_WIDTH,
      height,
      description: technologies.map((technology) => technology.name).join(', '),
    },
    drawn.join(''),
  );
}
