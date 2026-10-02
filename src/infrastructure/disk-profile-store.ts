import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { ProfileStore } from '../application/sync-profile.ts';

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** The files of the profile in a folder of the disk: the checkout of the repository. */
export class DiskProfileStore implements ProfileStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  /** A path that left the folder would write somewhere the sync does not own. */
  private locate(path: string): string {
    const located = resolve(this.root, path);
    if (!located.startsWith(`${this.root}${sep}`)) {
      throw new Error(`The path ${path} is outside the profile.`);
    }
    return located;
  }

  async read(path: string): Promise<string | null> {
    try {
      return await readFile(this.locate(path), 'utf8');
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async write(path: string, content: string): Promise<void> {
    const located = this.locate(path);
    await mkdir(dirname(located), { recursive: true });
    await writeFile(located, content, 'utf8');
  }

  async list(folder: string): Promise<string[]> {
    try {
      const entries = await readdir(this.locate(folder), { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => `${folder}/${entry.name}`);
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
  }

  async remove(path: string): Promise<void> {
    await rm(this.locate(path), { force: true });
  }
}
