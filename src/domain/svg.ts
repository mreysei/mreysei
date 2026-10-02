/**
 * What every image of the profile is built with. GitHub shows them as plain images, where no
 * font can be loaded and nothing is known about the monospace font that will draw them: every
 * text is given the width a monospace font would take, and the renderer fits it in.
 */
export const FONT_FAMILY =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

/** As wide as GitHub shows a README on a desk, so the cards are drawn at their own size there. */
export const IMAGE_WIDTH = 880;

/** A full-width character, as in Japanese, takes one em; any other, six tenths of it. */
const NARROW_ADVANCE = 0.6;
const FULL_WIDTH = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;

function emsOf(character: string): number {
  return FULL_WIDTH.test(character) ? 1 : NARROW_ADVANCE;
}

export function widthOf(text: string, fontSize: number): number {
  let ems = 0;
  for (const character of text) ems += emsOf(character);
  return Math.ceil(ems * fontSize);
}

const ELLIPSIS = '…';

/** The text, cut with an ellipsis when it is wider than the room it has. */
export function fit(text: string, maxWidth: number, fontSize: number): string {
  if (widthOf(text, fontSize) <= maxWidth) return text;
  let kept = '';
  for (const character of text) {
    if (widthOf(`${kept}${character}${ELLIPSIS}`, fontSize) > maxWidth) break;
    kept += character;
  }
  return `${kept.trimEnd()}${ELLIPSIS}`;
}

/**
 * The text in lines no wider than the room, broken between words. What does not fit in the
 * lines allowed is cut with an ellipsis, and so is a single word wider than a line.
 */
export function wrap(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  const words = text.split(/\s+/).filter((word) => word !== '');
  for (const [index, word] of words.entries()) {
    const longer = line === '' ? word : `${line} ${word}`;
    if (line === '' || widthOf(longer, fontSize) <= maxWidth) {
      line = longer;
      continue;
    }
    if (lines.length === maxLines - 1) {
      return [...lines, fit(`${line} ${words.slice(index).join(' ')}`, maxWidth, fontSize)];
    }
    lines.push(line);
    line = word;
  }
  return line === '' ? lines : [...lines, fit(line, maxWidth, fontSize)];
}

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Text for XML and HTML, as content or inside an attribute: never markup. */
export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

export interface TextOptions {
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  bold?: boolean;
  /** `middle` centres the text on `x`; it starts there otherwise. */
  anchor?: 'start' | 'middle';
  className?: string;
  style?: string;
}

/** One line of text, vertically centred on `y`, as wide as a monospace font would make it. */
export function textElement(text: string, options: TextOptions): string {
  const attributes = [
    `x="${options.x}"`,
    `y="${options.y}"`,
    'dominant-baseline="central"',
    `font-size="${options.fontSize}"`,
    `textLength="${widthOf(text, options.fontSize)}"`,
    'lengthAdjust="spacingAndGlyphs"',
    `fill="${options.fill}"`,
    ...(options.bold === true ? ['font-weight="700"'] : []),
    ...(options.anchor === 'middle' ? ['text-anchor="middle"'] : []),
    ...(options.className === undefined ? [] : [`class="${options.className}"`]),
    ...(options.style === undefined ? [] : [`style="${options.style}"`]),
  ];
  return `<text ${attributes.join(' ')}>${escapeXml(text)}</text>`;
}

/** A 24 x 24 icon drawn `size` wide with its corner at `x`, `y`. */
export function iconElement(
  path: string,
  position: { x: number; y: number; size: number },
  fill: string,
): string {
  const scale = position.size / 24;
  return `<path transform="translate(${position.x} ${position.y}) scale(${scale})" fill="${fill}" d="${escapeXml(path)}"/>`;
}

export interface SvgOptions {
  width: number;
  height: number;
  /** Read instead of the image. */
  description: string;
  /** Animations; the image carries no other style sheet. */
  styles?: string;
}

/** The document of an image, with the font of all its texts. */
export function svgDocument(options: SvgOptions, body: string): string {
  const description = escapeXml(options.description);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" ` +
    `viewBox="0 0 ${options.width} ${options.height}" role="img" aria-label="${description}" ` +
    `font-family="${FONT_FAMILY}">` +
    `<title>${description}</title>` +
    (options.styles === undefined ? '' : `<style>${options.styles}</style>`) +
    body +
    `</svg>\n`
  );
}
