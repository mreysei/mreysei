import { iconElement, svgDocument, textElement, widthOf } from './svg.ts';
import { BRAND, PALETTES } from './theme.ts';

/** Tall enough to press with a finger: the README shows the buttons at this height. */
export const LINK_BADGE_HEIGHT = 40;
const PADDING = 14;
const ICON = 18;
const GAP = 9;
const FONT_SIZE = 14;

export type BadgeIcon = { kind: 'path'; path: string } | { kind: 'none' };

export interface LinkBadge {
  label: string;
  icon: BadgeIcon;
}

function drawIcon(icon: BadgeIcon, x: number, y: number): string {
  return icon.kind === 'path' ? iconElement(icon.path, { x, y, size: ICON }, BRAND.onInk) : '';
}

/**
 * A link of the profile as a button: one image for both colour schemes, dark like the tile of
 * the logo, with an outline that keeps its shape on a dark page.
 */
export function renderLinkBadge({ label, icon }: LinkBadge): string {
  const textX = icon.kind === 'none' ? PADDING : PADDING + ICON + GAP;
  const width = textX + widthOf(label, FONT_SIZE) + PADDING;
  return svgDocument(
    { width, height: LINK_BADGE_HEIGHT, description: label },
    `<rect x="0.75" y="0.75" width="${width - 1.5}" height="${LINK_BADGE_HEIGHT - 1.5}" rx="10" fill="${BRAND.ink}" stroke="${PALETTES.dark.border}" stroke-width="1.5"/>` +
      drawIcon(icon, PADDING, (LINK_BADGE_HEIGHT - ICON) / 2) +
      textElement(label, {
        x: textX,
        y: LINK_BADGE_HEIGHT / 2,
        fontSize: FONT_SIZE,
        fill: BRAND.onInk,
        bold: true,
      }),
  );
}
