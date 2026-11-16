import type { Picture, ProfileContent } from '../domain/content.ts';
import { ASSETS_FOLDER, buildProfileFiles, SITES, type Site } from '../domain/profile-files.ts';

/** Where the content of the profile is read from. */
export interface ContentSource {
  /** Fails when the content cannot be read or is not what the contract says. */
  read(): Promise<ProfileContent>;
}

/** The pictures of the portfolio, at a width it serves them. */
export interface PictureSource {
  /** The picture as a `data:` address. Fails when it cannot be read or is not a picture. */
  read(url: string, width: number): Promise<string>;
}

/** The screenshots of the owner's sites, taken by hand when one of them changes its look. */
export interface PreviewSource {
  /** The screenshot as a `data:` address, or null while there is none. */
  read(site: Site): Promise<string | null>;
}

/** The files of the profile, wherever they are kept. Paths use `/` and are relative to it. */
export interface ProfileStore {
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  /** The files of a folder, as paths of the store. */
  list(folder: string): Promise<string[]>;
  remove(path: string): Promise<void>;
}

export interface SyncResult {
  written: string[];
  removed: string[];
}

export interface SyncProfileDependencies {
  source: ContentSource;
  store: ProfileStore;
  pictures: PictureSource;
  previews: PreviewSource;
  /** Address of the counter of views, without its query. */
  viewsImageUrl: string;
}

/** Twice the size the hero draws them at, among the widths the CDN serves. */
const AVATAR_WIDTH = 320;
const BANNER_WIDTH = 960;

/**
 * Writes the profile from its content: only the files that changed, and the images it no longer
 * needs are removed. When the content cannot be read nothing is touched: the profile keeps what
 * it had.
 */
export function makeSyncProfile({
  source,
  store,
  pictures,
  previews,
  viewsImageUrl,
}: SyncProfileDependencies) {
  // A picture that cannot be read stops the sync, like the content: drawn without it, the
  // profile would change, and change back with the next run.
  const pictureOf = (picture: Picture | null, width: number) =>
    picture === null ? Promise.resolve(null) : pictures.read(picture.url, width);

  return async function syncProfile(): Promise<SyncResult> {
    const content = await source.read();
    const [avatar, banner, ...shots] = await Promise.all([
      pictureOf(content.profile.avatar, AVATAR_WIDTH),
      pictureOf(content.profile.banner, BANNER_WIDTH),
      ...SITES.map((site) => previews.read(site)),
    ]);
    const [portfolio = null, terminal = null, play = null] = shots;
    const files = buildProfileFiles(content, viewsImageUrl, {
      hero: { avatar, banner },
      previews: { portfolio, terminal, play },
    });
    const written: string[] = [];
    for (const file of files) {
      if ((await store.read(file.path)) === file.content) continue;
      await store.write(file.path, file.content);
      written.push(file.path);
    }

    const kept = new Set(files.map((file) => file.path));
    const removed = (await store.list(ASSETS_FOLDER)).filter((path) => !kept.has(path));
    for (const path of removed) await store.remove(path);

    return { written, removed };
  };
}

export type SyncProfile = ReturnType<typeof makeSyncProfile>;
