import { logoElement } from './logo.ts';
import { iconElement, svgDocument, textElement, widthOf } from './svg.ts';
import { BRAND, PALETTES } from './theme.ts';

/** Tall enough to press with a finger: the README shows the buttons at this height. */
export const LINK_BADGE_HEIGHT = 40;
const PADDING = 14;
const ICON = 18;
const GAP = 9;
const FONT_SIZE = 14;

export type BadgeIcon = { kind: 'logo' } | { kind: 'path'; path: string } | { kind: 'none' };

export interface LinkBadge {
  label: string;
  icon: BadgeIcon;
  /** The link to the owner's own site wears the violet of the logo around it. */
  primary: boolean;
}

function drawIcon(icon: BadgeIcon, x: number, y: number): string {
  if (icon.kind === 'path') return iconElement(icon.path, { x, y, size: ICON }, BRAND.onInk);
  // The logo has air around its shape: drawn a little larger, it weighs as much as an icon.
  return icon.kind === 'logo' ? logoElement(x - 2, y - 2, ICON + 4) : '';
}

/**
 * A link of the profile as a button: one image for both colour schemes, dark like the tile of
 * the logo, with an outline that keeps its shape on a dark page.
 */
export function renderLinkBadge({ label, icon, primary }: LinkBadge): string {
  const textX = icon.kind === 'none' ? PADDING : PADDING + ICON + GAP;
  const width = textX + widthOf(label, FONT_SIZE) + PADDING;
  const stroke = primary ? BRAND.violet : PALETTES.dark.border;
  return svgDocument(
    { width, height: LINK_BADGE_HEIGHT, description: label },
    `<rect x="0.75" y="0.75" width="${width - 1.5}" height="${LINK_BADGE_HEIGHT - 1.5}" rx="10" fill="${BRAND.ink}" stroke="${stroke}" stroke-width="1.5"/>` +
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
