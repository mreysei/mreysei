import { describeActivity, renderActivity } from './activity.ts';
import { describeBanner, renderBanner, type HeroPictures } from './banner.ts';
import type { ProfileContent, ProfileLink } from './content.ts';
import { renderLinkBadge } from './link-badge.ts';
import { renderSiteButton } from './site-button.ts';
import { hostOf, renderReadme, type ReadmeImages } from './readme.ts';
import { describeStack, renderStack } from './stack.ts';
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

export const SITES = ['portfolio', 'terminal', 'play'] as const;
export type Site = (typeof SITES)[number];

/** What the images show that the content only names: its pictures and the faces of the sites. */
export interface ProfilePictures {
  hero: HeroPictures;
  /** A screenshot of each site as a `data:` address, or null. */
  previews: Readonly<Record<Site, string | null>>;
}

const SITE_NAMES: Readonly<Record<Site, string>> = {
  portfolio: 'Portfolio',
  terminal: 'Terminal',
  play: 'Play',
};

/** The owner's sites, in the order of the footer of the portfolio: the ones it shows. */
function sitesOf(content: ProfileContent): { site: Site; url: string }[] {
  const urls: Record<Site, string | null> = {
    portfolio: content.siteUrl,
    terminal: content.terminalUrl,
    play: content.playUrl,
  };
  return SITES.flatMap((site) => {
    const url = urls[site];
    return url === null ? [] : [{ site, url }];
  });
}

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
export function buildProfileFiles(
  content: ProfileContent,
  viewsImageUrl: string,
  pictures: ProfilePictures,
): ProfileFile[] {
  const { activity, technologies } = content;
  const sites = sitesOf(content).map(({ site, url }) => ({
    site,
    url,
    name: SITE_NAMES[site],
    host: hostOf(url),
    path: asset(`site-${site}.svg`),
  }));
  const links = linkImages(content.links.filter(linkedFromProfile));
  const viewsOf = (theme: string) =>
    `${viewsImageUrl}?theme=${theme}&locale=${encodeURIComponent(content.locale)}`;

  const images: ReadmeImages = {
    banner: asset('banner'),
    stack: technologies.length === 0 ? null : asset('stack'),
    activity: activity === null ? null : asset('activity'),
    sites: sites.map(({ url, name, host, path }) => ({
      url,
      label: `${name}: ${host}`,
      image: path,
    })),
    links: links.map(({ link, path }) => ({ url: link.url, label: link.name, image: path })),
    views: { dark: viewsOf('dark'), light: viewsOf('light') },
  };

  return [
    {
      path: README_PATH,
      content: renderReadme(content, images, {
        banner: describeBanner(content),
        stack: `Technologies: ${describeStack(technologies)}`,
        activity: activity === null ? '' : describeActivity(activity),
      }),
    },
    ...inBothThemes(images.banner, (theme) => renderBanner(content, theme, pictures.hero)),
    ...sites.map(({ site, name, host, path }) => ({
      path,
      content: renderSiteButton({ name, host, preview: pictures.previews[site] }),
    })),
    ...links.map(({ link, path }) => ({
      path,
      content: renderLinkBadge({
        label: link.name,
        icon: link.iconPath === null ? { kind: 'none' } : { kind: 'path', path: link.iconPath },
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
