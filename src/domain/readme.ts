import type { CareerEntry, Post, ProfileContent, Project, ProjectKind } from './content.ts';
import { LINK_BADGE_HEIGHT } from './link-badge.ts';
import { escapeXml } from './svg.ts';

/** Where the README finds what the sync wrote next to it. */
export interface ReadmeImages {
  /** Both colour schemes of an image, without the `-dark.svg` or `-light.svg` that ends them. */
  banner: string;
  stack: string | null;
  activity: string | null;
  /** The links of the profile, in order, each with the image of its button. */
  links: { url: string; label: string; image: string }[];
  /** The counter of views of the profile, served by the portfolio in a colour scheme. */
  views: { dark: string; light: string };
}

export interface ReadmeTexts {
  /** Read instead of each image. */
  banner: string;
  stack: string;
  activity: string;
}

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * One line of plain text inside Markdown: nothing a text carries turns into markup, a heading, a
 * list or a link. GitHub links a bare address or email on its own, so `://`, `www.` and `@` are
 * escaped too.
 */
export function inline(text: string): string {
  return (
    text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/[\\`*_[\]|~@]/g, (character) => `\\${character}`)
      .replace(/:\/\//g, '\\://')
      .replace(/\bwww\./gi, (start) => `${start.slice(0, 3)}\\.`)
      // What would open a block where the text starts a line: a heading, a list or a rule.
      .replace(/^[#+=-]/, (start) => `\\${start}`)
      .replace(/^(\d+)([.)])/, '$1\\$2')
  );
}

/**
 * The bio is the owner's Markdown and is kept as Markdown, without HTML: the portfolio shows it
 * without any, and an unclosed tag or comment here would swallow the rest of the README.
 */
function markdownWithoutHtml(markdown: string): string {
  return markdown.trim().replace(/</g, '&lt;');
}

/** A destination inside `[text](…)`: a parenthesis or a space would end it early. */
function destination(url: string): string {
  return url.replace(/[()\s<>]/g, (character) => encodeURIComponent(character));
}

const link = (text: string, url: string) => `[${inline(text)}](${destination(url)})`;

/** An image for each colour scheme: GitHub shows the one of the reader's theme. */
function themed(base: string, attributes: string, alt: string): string {
  return [
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${escapeXml(`${base}-dark.svg`)}">`,
    `  <source media="(prefers-color-scheme: light)" srcset="${escapeXml(`${base}-light.svg`)}">`,
    `  <img src="${escapeXml(`${base}-dark.svg`)}" ${attributes} alt="${escapeXml(alt)}">`,
    '</picture>',
  ].join('\n');
}

function header(content: ProfileContent, images: ReadmeImages, texts: ReadmeTexts): string {
  const buttons = images.links.map(
    ({ url, label, image }) =>
      `<a href="${escapeXml(url)}"><img src="${escapeXml(image)}" height="${LINK_BADGE_HEIGHT}" alt="${escapeXml(label)}"></a>`,
  );
  return [
    '<div align="center">',
    '',
    `<a href="${escapeXml(content.siteUrl)}">`,
    themed(images.banner, 'width="100%"', texts.banner),
    '</a>',
    '',
    ...(buttons.length === 0 ? [] : ['<p>', buttons.join('\n'), '</p>', '']),
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${escapeXml(images.views.dark)}">`,
    `  <source media="(prefers-color-scheme: light)" srcset="${escapeXml(images.views.light)}">`,
    `  <img src="${escapeXml(images.views.dark)}" height="28" alt="${VIEWS_ALT}">`,
    '</picture>',
    '',
    '</div>',
  ].join('\n');
}

/**
 * The banner is an image: what it says is said here again as text, so it can be read, selected
 * and found. The name is the title of the profile page itself.
 */
function introduction({ profile }: ProfileContent): string[] {
  const role = [profile.role, profile.location].filter((part) => part !== '').map(inline);
  const lines = [
    ...(profile.headline.trim() === '' ? [] : [`**${inline(profile.headline)}**`]),
    ...(role.length === 0 ? [] : [role.join(' · ')]),
  ];
  return lines.length === 0 ? [] : [lines.join('<br>\n')];
}

function about(content: ProfileContent): string[] {
  const { bio, availableForWork } = content.profile;
  const said = introduction(content);
  if (said.length === 0 && bio.trim() === '' && !availableForWork) return [];
  return [
    '## About',
    ...said,
    ...(bio.trim() === '' ? [] : [markdownWithoutHtml(bio)]),
    ...(availableForWork
      ? [
          `**Available for new projects.** Write to me from ${link(hostOf(content.siteUrl), content.siteUrl)}.`,
        ]
      : []),
  ];
}

/** The minutes of a post with a video are of reading and watching: `read` alone would be wrong. */
function timeOf(post: Post): string {
  return `${post.readingMinutes} min ${post.includesVideo ? 'to read and watch' : 'read'}`;
}

function postItem(post: Post): string {
  const minutes = timeOf(post);
  return [
    `- **${link(post.title, post.url)}**<br>`,
    ...(post.excerpt.trim() === '' ? [] : [`  ${inline(post.excerpt)}<br>`]),
    `  <sub>${day.format(new Date(post.publishedAt))} · ${minutes}</sub>`,
  ].join('\n');
}

function posts(content: ProfileContent): string[] {
  if (content.posts.length === 0) return [];
  return [
    '## Latest posts',
    content.posts.map(postItem).join('\n'),
    `${link('Every post on the blog', content.blogUrl)} →`,
  ];
}

const PROJECT_KIND_NAMES: Readonly<Record<ProjectKind, string | null>> = {
  web: 'Web',
  'mobile-app': 'Mobile app',
  'desktop-app': 'Desktop app',
  library: 'Library',
  other: null,
};

function projectItem(project: Project): string {
  const kind = PROJECT_KIND_NAMES[project.kind];
  const details = [...(kind === null ? [] : [kind]), String(project.year)].join(' · ');
  const tagline = project.tagline.trim() === '' ? '' : `<br>\n  ${inline(project.tagline)}`;
  return `- **${link(project.name, project.url)}** <sub>${details}</sub>${tagline}`;
}

function projects(content: ProfileContent): string[] {
  if (content.projects.length === 0) return [];
  return ['## Projects', content.projects.map(projectItem).join('\n')];
}

function monthOf(isoMonth: string): string {
  return month.format(new Date(`${isoMonth}-01T00:00:00.000Z`));
}

function careerRow(entry: CareerEntry): string {
  const period = `${monthOf(entry.startDate)} – ${entry.endDate === null ? 'Present' : monthOf(entry.endDate)}`;
  const organization =
    entry.organizationUrl === null
      ? inline(entry.organization)
      : link(entry.organization, entry.organizationUrl);
  return `| ${period} | ${inline(entry.title)} | ${organization} |`;
}

function career(content: ProfileContent): string[] {
  if (content.career.length === 0) return [];
  return [
    '## Career',
    ['| When | What | Where |', '| --- | --- | --- |', ...content.career.map(careerRow)].join('\n'),
  ];
}

function centred(heading: string, image: string): string {
  return ['<div align="center">', '', heading, '', image, '', '</div>'].join('\n');
}

/**
 * The figure changes with every reader and the README is only written when the content does:
 * the text says what the image is, never a figure that would be out of date.
 */
const VIEWS_ALT = 'profile views counter';

/** For whoever opens the file to edit it: the next sync would undo the change. */
const NOTICE =
  '<!-- Written by the sync of this repository from the content of the portfolio. Do not edit it by hand: see docs/SYNC.md. -->';

export function hostOf(url: string): string {
  return new URL(url).host;
}

/**
 * The README of the profile, section by section. A section without content is left out, so the
 * profile never shows an empty heading.
 */
export function renderReadme(
  content: ProfileContent,
  images: ReadmeImages,
  texts: ReadmeTexts,
): string {
  const sections = [
    NOTICE,
    header(content, images, texts),
    ...about(content),
    ...posts(content),
    ...projects(content),
    ...career(content),
    ...(images.stack === null
      ? []
      : [centred('## Stack', themed(images.stack, 'width="100%"', texts.stack))]),
    ...(images.activity === null
      ? []
      : [centred('## GitHub in numbers', themed(images.activity, 'width="100%"', texts.activity))]),
    '---',
    [
      '<div align="center">',
      `<sub>Written from the content of <a href="${escapeXml(content.siteUrl)}">${escapeXml(hostOf(content.siteUrl))}</a> by a workflow of this repository.</sub>`,
      '</div>',
    ].join('\n'),
  ];
  return `${sections.join('\n\n')}\n`;
}
