import { logoElement } from './logo.ts';
import { fit, pictureElement, svgDocument, textElement } from './svg.ts';
import { BRAND } from './theme.ts';

/** The three buttons are one size, so they line up side by side and weigh the same. */
const SITE_BUTTON_WIDTH = 280;
const SITE_BUTTON_HEIGHT = 190;
const PADDING = 16;
/** Large enough to read when a phone shows the button at a third of its width. */
const NAME_SIZE = 34;
const ARROW = 32;
const LOGO = 96;
const TEXT_WIDTH = SITE_BUTTON_WIDTH - 2 * PADDING;

export interface SiteButton {
  /** What the site is called, such as `Terminal`. */
  name: string;
  /** Where it is, such as `terminal.example.org`: read instead of the image, too small to draw. */
  host: string;
  /** A screenshot of the site as a `data:` address; null draws the tile of the logo instead. */
  preview: string | null;
}

/** A chevron pointing up and to the right: the button opens another site. */
const ARROW_PATH = 'M10 8h6v6M16 8l-8 8';

/**
 * A way into one of the owner's sites, as a button whose face is the site itself: its preview
 * fills the button, darkened towards the foot so its name reads on any picture. One image for
 * both colour schemes: it is a picture of the site, and the site has its own colours.
 */
export function renderSiteButton({ name, host, preview }: SiteButton): string {
  const width = SITE_BUTTON_WIDTH;
  const height = SITE_BUTTON_HEIGHT;
  // In the top corner, so the name has the whole width of the foot.
  const arrowX = width - PADDING - ARROW;
  const arrowY = PADDING;
  return svgDocument(
    { width, height, description: `${name}: ${host}` },
    `<clipPath id="face"><rect width="${width}" height="${height}" rx="16"/></clipPath>` +
      `<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0.2" stop-color="${BRAND.ink}" stop-opacity="0"/>` +
      `<stop offset="0.5" stop-color="${BRAND.ink}" stop-opacity="0.95"/>` +
      `<stop offset="1" stop-color="${BRAND.ink}" stop-opacity="0.97"/></linearGradient>` +
      `<g clip-path="url(#face)">` +
      `<rect width="${width}" height="${height}" fill="${BRAND.ink}"/>` +
      (preview === null
        ? logoElement((width - LOGO) / 2, PADDING, LOGO)
        : pictureElement(preview, { x: 0, y: 0, width, height }, 'xMidYMin')) +
      `<rect width="${width}" height="${height}" fill="url(#shade)"/>` +
      `</g>` +
      textElement(fit(name, TEXT_WIDTH, NAME_SIZE), {
        x: PADDING,
        y: height - PADDING - NAME_SIZE / 2,
        fontSize: NAME_SIZE,
        fill: BRAND.onInk,
        weight: 800,
        sans: true,
      }) +
      `<circle cx="${arrowX + ARROW / 2}" cy="${arrowY + ARROW / 2}" r="${ARROW / 2}" fill="${BRAND.violet}"/>` +
      `<path transform="translate(${arrowX + 3} ${arrowY + 3})" d="${ARROW_PATH}" fill="none" stroke="${BRAND.onViolet}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      // The edge of a button: the violet of the logo, as the link to the site always wore.
      `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="15" fill="none" stroke="${BRAND.violet}" stroke-width="2"/>`,
  );
}
