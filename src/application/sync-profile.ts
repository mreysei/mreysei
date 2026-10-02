import type { ProfileContent } from '../domain/content.ts';
import { ASSETS_FOLDER, buildProfileFiles } from '../domain/profile-files.ts';

/** Where the content of the profile is read from. */
export interface ContentSource {
  /** Fails when the content cannot be read or is not what the contract says. */
  read(): Promise<ProfileContent>;
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
  /** Address of the counter of views, without its query. */
  viewsImageUrl: string;
}

/**
 * Writes the profile from its content: only the files that changed, and the images it no longer
 * needs are removed. When the content cannot be read nothing is touched: the profile keeps what
 * it had.
 */
export function makeSyncProfile({ source, store, viewsImageUrl }: SyncProfileDependencies) {
  return async function syncProfile(): Promise<SyncResult> {
    const files = buildProfileFiles(await source.read(), viewsImageUrl);
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
