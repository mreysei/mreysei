import type { ProfileContent } from './content.ts';
import { logoElement } from './logo.ts';
import { fit, IMAGE_WIDTH, svgDocument, textElement, widthOf, wrap } from './svg.ts';
import { BRAND, PALETTES, type Palette, type Theme } from './theme.ts';

const PADDING = 28;
const TITLE_BAR = 38;
const LOGO_TILE = 150;
const FONT_SIZE = 15;
const NAME_SIZE = 24;
const LINE_HEIGHT = 27;
const NAME_LINE_HEIGHT = 36;
/** Texts stop before the tile of the logo. */
const TEXT_WIDTH = IMAGE_WIDTH - 2 * PADDING - LOGO_TILE - 24;
/** A long headline takes a second line; beyond that it is cut. */
const ANSWER_LINES = 2;
const PROMPT = '$';
const COMMAND_X = PADDING + widthOf(`${PROMPT} `, FONT_SIZE);

/**
 * Everything stops moving before five seconds, the cursor included, so nobody needs a way to
 * pause it: the three commands take about three seconds to type and answer.
 */
const START_SECONDS = 0.3;
const SECONDS_PER_CHARACTER = 0.045;
const ANSWER_AFTER_SECONDS = 0.12;
const PAUSE_SECONDS = 0.28;
const BLINK_SECONDS = 0.8;
const CURSOR_BLINKS = 2;

/**
 * Animations only hide what is already drawn: the image reads whole where they do not run, and
 * for whoever asked for less motion.
 */
const STYLES =
  '.cover{opacity:0;transform-box:fill-box;transform-origin:right;animation-name:type;animation-fill-mode:backwards}' +
  '.shown{animation:show .2s ease-out backwards}' +
  `.cursor{animation:show .01s linear backwards,blink ${BLINK_SECONDS}s steps(1)}` +
  '@keyframes type{from{opacity:1;transform:scaleX(1)}to{opacity:1;transform:scaleX(0)}}' +
  '@keyframes show{from{opacity:0}}' +
  '@keyframes blink{50%{opacity:0}}' +
  '@media (prefers-reduced-motion:reduce){.cover,.shown,.cursor{animation:none}}';

interface Answer {
  text: string;
  color: keyof Pick<Palette, 'text' | 'textMuted' | 'string' | 'property'>;
  /** The name of the owner is the one line written large. */
  large?: boolean;
}

interface Exchange {
  command: string;
  answers: Answer[];
}

/** Organisations the owner works for now, schools left out. */
function currentWorkplaces(content: ProfileContent): string[] {
  return content.career
    .filter((entry) => entry.endDate === null && entry.kind !== 'education')
    .map((entry) => entry.organization);
}

const roleAndPlace = ({ profile }: ProfileContent) =>
  [profile.role, profile.location].filter((part) => part !== '').join(' · ');

/** What the terminal is asked and what it answers: who, what for, and where now. */
function exchangesOf(content: ProfileContent): Exchange[] {
  const { profile } = content;
  const role = roleAndPlace(content);
  const workplaces = currentWorkplaces(content);
  return [
    {
      command: 'whoami',
      answers: [
        { text: profile.name, color: 'text', large: true },
        ...(role === '' ? [] : [{ text: role, color: 'textMuted' as const }]),
      ],
    },
    ...(profile.headline === ''
      ? []
      : [
          {
            command: 'cat headline.txt',
            answers: [{ text: profile.headline, color: 'string' as const }],
          },
        ]),
    ...(workplaces.length === 0
      ? []
      : [
          {
            command: 'ls work/',
            answers: [{ text: workplaces.join('  '), color: 'property' as const }],
          },
        ]),
  ];
}

const withoutEnd = (sentence: string) => sentence.replace(/[.\s]+$/, '');

/** Everything the banner shows, in words, for whoever cannot see it. */
export function describeBanner(content: ProfileContent): string {
  const role = roleAndPlace(content);
  const workplaces = currentWorkplaces(content);
  return [
    [content.profile.name, role].filter((part) => part !== '').join(' — '),
    content.profile.headline,
    workplaces.length === 0 ? '' : `Currently at ${workplaces.join(', ')}`,
  ]
    .map(withoutEnd)
    .filter((sentence) => sentence !== '')
    .map((sentence) => `${sentence}.`)
    .join(' ');
}

function logoTile(x: number, y: number): string {
  const inset = 12;
  return (
    `<rect x="${x}" y="${y}" width="${LOGO_TILE}" height="${LOGO_TILE}" rx="24" fill="${BRAND.ink}" stroke="${BRAND.violet}" stroke-opacity="0.6"/>` +
    logoElement(x + inset, y + inset, LOGO_TILE - 2 * inset)
  );
}

const seconds = (value: number) => `${value.toFixed(2)}s`;

interface Terminal {
  /** The prompts, commands, answers and the cursor, already timed. */
  body: string;
  /** Where the last line ends. */
  bottom: number;
}

/** Types each command and shows its answer, one after the other, and leaves the cursor waiting. */
function drawTerminal(exchanges: readonly Exchange[], palette: Palette): Terminal {
  const parts: string[] = [];
  let y = TITLE_BAR + 34;
  let at = START_SECONDS;

  const promptAt = (delay: number) =>
    textElement(PROMPT, {
      x: PADDING,
      y,
      fontSize: FONT_SIZE,
      fill: palette.keyword,
      bold: true,
      className: 'shown',
      style: `animation-delay:${seconds(delay)}`,
    });

  for (const { command, answers } of exchanges) {
    const typing = command.length * SECONDS_PER_CHARACTER;
    parts.push(
      promptAt(at),
      textElement(command, { x: COMMAND_X, y, fontSize: FONT_SIZE, fill: palette.text }),
      // Slides away to the right, one character at a time, as the command is typed. It is
      // invisible by itself: only the animation ever shows it.
      `<rect class="cover" opacity="0" x="${COMMAND_X - 1}" y="${y - LINE_HEIGHT / 2}" width="${widthOf(command, FONT_SIZE) + 2}" height="${LINE_HEIGHT}" fill="${palette.surface}" ` +
        `style="animation-delay:${seconds(at)};animation-duration:${seconds(typing)};animation-timing-function:steps(${command.length})"/>`,
    );
    at += typing + ANSWER_AFTER_SECONDS;
    for (const answer of answers) {
      const large = answer.large === true;
      const fontSize = large ? NAME_SIZE : FONT_SIZE;
      for (const line of wrap(answer.text, TEXT_WIDTH, fontSize, large ? 1 : ANSWER_LINES)) {
        y += large ? NAME_LINE_HEIGHT : LINE_HEIGHT;
        parts.push(
          textElement(line, {
            x: PADDING,
            y,
            fontSize,
            fill: palette[answer.color],
            bold: large,
            className: 'shown',
            style: `animation-delay:${seconds(at)}`,
          }),
        );
      }
    }
    at += PAUSE_SECONDS;
    y += LINE_HEIGHT + 8;
  }

  parts.push(
    promptAt(at),
    `<rect class="cursor" x="${COMMAND_X}" y="${y - 9}" width="9" height="18" fill="${palette.accent}" ` +
      `style="animation-delay:${seconds(at)},${seconds(at)};animation-iteration-count:1,${CURSOR_BLINKS}"/>`,
  );
  return { body: parts.join(''), bottom: y };
}

/**
 * The header of the profile: a terminal that is asked who the owner is and answers with the
 * name, the role, the headline and the current work, next to the logo.
 */
export function renderBanner(content: ProfileContent, theme: Theme): string {
  const palette = PALETTES[theme];
  const terminal = drawTerminal(exchangesOf(content), palette);
  const height = Math.max(terminal.bottom + 30, TITLE_BAR + LOGO_TILE + 56);
  const title = fit(`${content.profile.handle} — zsh`, IMAGE_WIDTH - 240, 13);

  return svgDocument(
    { width: IMAGE_WIDTH, height, description: describeBanner(content), styles: STYLES },
    `<clipPath id="window"><rect width="${IMAGE_WIDTH}" height="${height}" rx="14"/></clipPath>` +
      `<g clip-path="url(#window)">` +
      `<rect width="${IMAGE_WIDTH}" height="${height}" fill="${palette.surface}"/>` +
      `<rect width="${IMAGE_WIDTH}" height="${TITLE_BAR}" fill="${palette.surfaceRaised}"/>` +
      `</g>` +
      [28, 48, 68]
        .map(
          (x) =>
            `<circle cx="${x}" cy="${TITLE_BAR / 2}" r="6" fill="${palette.border}" fill-opacity="0.55"/>`,
        )
        .join('') +
      textElement(title, {
        x: IMAGE_WIDTH / 2,
        y: TITLE_BAR / 2,
        fontSize: 13,
        fill: palette.textMuted,
        anchor: 'middle',
      }) +
      logoTile(
        IMAGE_WIDTH - PADDING - LOGO_TILE,
        TITLE_BAR + (height - TITLE_BAR - LOGO_TILE) / 2,
      ) +
      terminal.body +
      `<rect x="0.5" y="0.5" width="${IMAGE_WIDTH - 1}" height="${height - 1}" rx="13.5" fill="none" stroke="${palette.border}" stroke-opacity="0.6"/>`,
  );
}
