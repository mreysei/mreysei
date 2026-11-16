import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { PreviewSource } from '../application/sync-profile.ts';
import type { Site } from '../domain/profile-files.ts';
import { jpegDataUrl } from './jpeg.ts';

/** Where `npm run previews` leaves the screenshots, in the repository. */
export const PREVIEWS_FOLDER = 'previews';
/** Three of these sit in one image: each stays small. */
const MAX_BYTES = 150 * 1024;

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** The screenshots of the sites, kept in the repository as `previews/<site>.jpg`. */
export class DiskPreviewSource implements PreviewSource {
  private readonly folder: string;

  constructor(root: string) {
    this.folder = join(resolve(root), PREVIEWS_FOLDER);
  }

  async read(site: Site): Promise<string | null> {
    try {
      const bytes = await readFile(join(this.folder, `${site}.jpg`));
      return jpegDataUrl(bytes, MAX_BYTES, `The preview of ${site}`);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }
}
