import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SAMPLE_CONTENT } from '../testing/sample-content.ts';
import { makeSyncProfile, type ProfileStore } from './sync-profile.ts';

const VIEWS = 'https://www.example.org/api/github-profile/views.svg';

/** Files in memory, with what was done to them. */
class InMemoryProfileStore implements ProfileStore {
  readonly files = new Map<string, string>();
  readonly writes: string[] = [];

  read(path: string): Promise<string | null> {
    return Promise.resolve(this.files.get(path) ?? null);
  }

  write(path: string, content: string): Promise<void> {
    this.writes.push(path);
    this.files.set(path, content);
    return Promise.resolve();
  }

  list(folder: string): Promise<string[]> {
    return Promise.resolve([...this.files.keys()].filter((path) => path.startsWith(`${folder}/`)));
  }

  remove(path: string): Promise<void> {
    this.files.delete(path);
    return Promise.resolve();
  }
}

function setup(content = SAMPLE_CONTENT) {
  const store = new InMemoryProfileStore();
  const source = { content, read: () => Promise.resolve(source.content) };
  return { store, source, sync: makeSyncProfile({ source, store, viewsImageUrl: VIEWS }) };
}

describe('syncProfile', () => {
  it('writes the README and its images the first time', async () => {
    const { store, sync } = setup();

    const { written, removed } = await sync();

    assert.equal(written[0], 'README.md');
    assert.equal(written.length, 10);
    assert.deepEqual(removed, []);
    assert.ok(store.files.get('README.md')?.includes('## About'));
    assert.ok(store.files.get('assets/banner-dark.svg')?.startsWith('<svg '));
  });

  it('touches nothing while the content is the same', async () => {
    const { store, sync } = setup();
    await sync();
    store.writes.length = 0;

    assert.deepEqual(await sync(), { written: [], removed: [] });
    assert.deepEqual(store.writes, []);
  });

  it('writes only what a change of the content changes', async () => {
    const { source, sync } = setup();
    await sync();
    source.content = {
      ...SAMPLE_CONTENT,
      profile: { ...SAMPLE_CONTENT.profile, headline: 'I build faster websites.' },
    };

    const { written } = await sync();

    assert.deepEqual(written, ['README.md', 'assets/banner-dark.svg', 'assets/banner-light.svg']);
  });

  it('removes the images the profile no longer shows, and nothing outside their folder', async () => {
    const { store, source, sync } = setup();
    await sync();
    store.files.set('assets/left-behind.svg', '<svg/>');
    store.files.set('src/main.ts', 'kept');
    source.content = { ...SAMPLE_CONTENT, links: [], activity: null };

    const { removed } = await sync();

    assert.deepEqual(removed.sort(), [
      'assets/activity-dark.svg',
      'assets/activity-light.svg',
      'assets/left-behind.svg',
      'assets/link-linkedin.svg',
      'assets/link-other.svg',
    ]);
    assert.equal(store.files.get('src/main.ts'), 'kept');
    assert.ok(store.files.has('assets/banner-dark.svg'));
  });

  it('keeps the profile as it was when the content cannot be read', async () => {
    const store = new InMemoryProfileStore();
    store.files.set('README.md', 'the profile of yesterday');
    store.files.set('assets/banner-dark.svg', '<svg/>');
    const sync = makeSyncProfile({
      source: {
        read: () => Promise.reject(new Error('The portfolio answered 503 for the content.')),
      },
      store,
      viewsImageUrl: VIEWS,
    });

    await assert.rejects(sync(), /answered 503/);
    assert.deepEqual(
      [...store.files],
      [
        ['README.md', 'the profile of yesterday'],
        ['assets/banner-dark.svg', '<svg/>'],
      ],
    );
  });
});
