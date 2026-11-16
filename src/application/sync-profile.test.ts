import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SAMPLE_CONTENT, SAMPLE_PICTURE } from '../testing/sample-content.ts';
import {
  makeSyncProfile,
  type PictureSource,
  type PreviewSource,
  type ProfileStore,
} from './sync-profile.ts';

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

/** Every picture asked for, and the same small JPEG for each. */
class FakePictureSource implements PictureSource {
  readonly asked: [string, number][] = [];

  read(url: string, width: number): Promise<string> {
    this.asked.push([url, width]);
    return Promise.resolve(SAMPLE_PICTURE);
  }
}

const previews: PreviewSource = {
  read: (site) => Promise.resolve(site === 'play' ? null : SAMPLE_PICTURE),
};

function setup(content = SAMPLE_CONTENT) {
  const store = new InMemoryProfileStore();
  const pictures = new FakePictureSource();
  const source = { content, read: () => Promise.resolve(source.content) };
  const sync = makeSyncProfile({ source, store, pictures, previews, viewsImageUrl: VIEWS });
  return { store, source, pictures, sync };
}

describe('syncProfile', () => {
  it('writes the README and its images the first time', async () => {
    const { store, sync } = setup();

    const { written, removed } = await sync();

    assert.equal(written[0], 'README.md');
    assert.equal(written.length, 12);
    assert.deepEqual(removed, []);
    assert.ok(store.files.get('README.md')?.includes('## About'));
    assert.ok(store.files.get('assets/banner-dark.svg')?.startsWith('<svg '));
  });

  it('draws the photo and the banner of the portfolio, at twice the size the hero shows them', async () => {
    const { store, pictures, sync } = setup({
      ...SAMPLE_CONTENT,
      profile: {
        ...SAMPLE_CONTENT.profile,
        banner: { url: 'https://cdn.example.org/banner.jpg', alt: '', width: null, height: null },
      },
    });

    await sync();

    assert.deepEqual(pictures.asked, [
      ['https://cdn.example.org/ada.jpg', 320],
      ['https://cdn.example.org/banner.jpg', 960],
    ]);
    assert.equal(store.files.get('assets/banner-dark.svg')?.split('<image').length, 3);
    assert.match(store.files.get('assets/site-terminal.svg') ?? '', /<image/);
    assert.doesNotMatch(store.files.get('assets/site-play.svg') ?? '', /<image/);
  });

  it('asks for no picture the portfolio has not got', async () => {
    const { pictures, sync } = setup({
      ...SAMPLE_CONTENT,
      profile: { ...SAMPLE_CONTENT.profile, avatar: null, banner: null },
    });

    await sync();

    assert.deepEqual(pictures.asked, []);
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
      pictures: new FakePictureSource(),
      previews,
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

  it('keeps the profile as it was when a picture cannot be read', async () => {
    const store = new InMemoryProfileStore();
    store.files.set('README.md', 'the profile of yesterday');
    const sync = makeSyncProfile({
      source: { read: () => Promise.resolve(SAMPLE_CONTENT) },
      store,
      pictures: { read: () => Promise.reject(new Error('The CDN answered 404.')) },
      previews,
      viewsImageUrl: VIEWS,
    });

    await assert.rejects(sync(), /answered 404/);
    assert.deepEqual([...store.files], [['README.md', 'the profile of yesterday']]);
  });
});
