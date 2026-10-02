import { describeActivity, renderActivity } from './activity.ts';
import { describeBanner, renderBanner } from './banner.ts';
import type { ProfileContent, ProfileLink } from './content.ts';
import { renderLinkBadge } from './link-badge.ts';
import { hostOf, renderReadme, type ReadmeImages } from './readme.ts';
import { renderStack } from './stack.ts';
import { THEMES } from './theme.ts';

export const README_PATH = 'README.md';
/** Everything in this folder is written by the sync: what it no longer writes is removed. */
export const ASSETS_FOLDER = 'assets';

export interface ProfileFile {
  /** Relative to the repository, with `/` between folders. */
  path: string;
  content: string;
}

const asset = (name: string) => `${ASSETS_FOLDER}/${name}`;

function inBothThemes(base: string, render: (theme: (typeof THEMES)[number]) => string) {
  return THEMES.map((theme) => ({ path: `${base}-${theme}.svg`, content: render(theme) }));
}

/** The profile on GitHub itself is where the reader already is. */
const linkedFromProfile = (link: ProfileLink) => link.platform !== 'github';

/** A second link of a platform gets a number, so no image overwrites another. */
function linkImages(links: readonly ProfileLink[]): { link: ProfileLink; path: string }[] {
  const seen = new Map<string, number>();
  return links.map((link) => {
    const count = (seen.get(link.platform) ?? 0) + 1;
    seen.set(link.platform, count);
    return { link, path: asset(`link-${link.platform}${count === 1 ? '' : `-${count}`}.svg`) };
  });
}

/**
 * Every file of the profile for a content: the README and the images it shows. The same content
 * always gives the same files, byte for byte, so nothing changes while the content does not.
 */
export function buildProfileFiles(content: ProfileContent, viewsImageUrl: string): ProfileFile[] {
  const { activity, technologies } = content;
  const site = { path: asset('link-site.svg'), label: hostOf(content.siteUrl) };
  const links = linkImages(content.links.filter(linkedFromProfile));
  const viewsOf = (theme: string) =>
    `${viewsImageUrl}?theme=${theme}&locale=${encodeURIComponent(content.locale)}`;

  const images: ReadmeImages = {
    banner: asset('banner'),
    stack: technologies.length === 0 ? null : asset('stack'),
    activity: activity === null ? null : asset('activity'),
    links: [
      { url: content.siteUrl, label: site.label, image: site.path },
      ...links.map(({ link, path }) => ({ url: link.url, label: link.name, image: path })),
    ],
    views: { dark: viewsOf('dark'), light: viewsOf('light') },
  };

  return [
    {
      path: README_PATH,
      content: renderReadme(content, images, {
        banner: describeBanner(content),
        stack: `Technologies: ${technologies.map((technology) => technology.name).join(', ')}`,
        activity: activity === null ? '' : describeActivity(activity),
      }),
    },
    ...inBothThemes(images.banner, (theme) => renderBanner(content, theme)),
    {
      path: site.path,
      content: renderLinkBadge({ label: site.label, icon: { kind: 'logo' }, primary: true }),
    },
    ...links.map(({ link, path }) => ({
      path,
      content: renderLinkBadge({
        label: link.name,
        icon: link.iconPath === null ? { kind: 'none' } : { kind: 'path', path: link.iconPath },
        primary: false,
      }),
    })),
    ...(images.stack === null
      ? []
      : inBothThemes(images.stack, (theme) => renderStack(technologies, theme))),
    ...(activity === null || images.activity === null
      ? []
      : inBothThemes(images.activity, (theme) => renderActivity(activity, theme))),
  ];
}
