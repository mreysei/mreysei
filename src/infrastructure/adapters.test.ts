import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { SAMPLE_CONTENT } from '../testing/sample-content.ts';
import { profileContentSchema } from './content-schema.ts';
import { DiskPreviewSource } from './disk-preview-source.ts';
import { DiskProfileStore } from './disk-profile-store.ts';
import { HttpContentSource } from './http-content-source.ts';
import { HttpPictureSource } from './http-picture-source.ts';

const [post] = SAMPLE_CONTENT.posts;
const [link] = SAMPLE_CONTENT.links;
const [technology] = SAMPLE_CONTENT.technologies;
if (!post || !link || !technology) throw new Error('The sample has every section.');

const ORIGIN = 'https://www.example.org';

/** The sample as a portfolio older than the profile answers it: no other sites, no pictures. */
function olderContent(): Record<string, unknown> {
  const profile: Record<string, unknown> = { ...SAMPLE_CONTENT.profile };
  delete profile.avatar;
  delete profile.banner;
  const older: Record<string, unknown> = { ...SAMPLE_CONTENT, profile };
  delete older.terminalUrl;
  delete older.playUrl;
  return older;
}
const schema = profileContentSchema(ORIGIN);

describe('profileContentSchema', () => {
  it('takes a content with every section', () => {
    assert.deepEqual(schema.parse(SAMPLE_CONTENT), SAMPLE_CONTENT);
  });

  it('takes the content of a portfolio in development, asked at its own address', () => {
    const local = JSON.parse(
      JSON.stringify(SAMPLE_CONTENT).replaceAll(ORIGIN, 'http://localhost:4000'),
    ) as unknown;

    assert.ok(profileContentSchema('http://localhost:4000').safeParse(local).success);
    assert.equal(schema.safeParse(local).success, false);
  });

  it('takes a platform and a language it has never heard of', () => {
    const parsed = schema.safeParse({
      ...SAMPLE_CONTENT,
      locale: 'pt',
      links: [{ ...link, platform: 'newnetwork2' }],
    });

    assert.ok(parsed.success);
  });

  it('takes a post that was published on another website', () => {
    assert.ok(
      schema.safeParse({
        ...SAMPLE_CONTENT,
        posts: [{ ...post, url: 'https://blog.example.net/an-article' }],
      }).success,
    );
  });

  it('takes the content of a portfolio older than the profile, without pictures or sites', () => {
    const parsed = schema.parse(olderContent());

    assert.equal(parsed.terminalUrl, undefined);
    assert.equal(parsed.profile.avatar, null);
    assert.equal(parsed.profile.banner, null);
  });

  it('drops what the contract does not name', () => {
    const parsed = schema.parse({ ...SAMPLE_CONTENT, secret: 'x' });

    assert.ok(!('secret' in parsed));
  });

  const { profile } = SAMPLE_CONTENT;
  const [project] = SAMPLE_CONTENT.projects;
  const refused: [string, object][] = [
    ['a link that runs a script', { links: [{ ...link, url: 'javascript:alert(1)' }] }],
    ['a link to no domain', { links: [{ ...link, url: 'https://localhost/x' }] }],
    ['a link to an address of numbers', { links: [{ ...link, url: 'https://198.51.100.7/x' }] }],
    ['a link without https', { links: [{ ...link, url: 'http://www.example.net/x' }] }],
    [
      'a link that hides where it leads',
      { links: [{ ...link, url: 'https://www.example.org@evil.example/x' }] },
    ],
    ['a link with a port', { links: [{ ...link, url: 'https://www.example.net:8443/x' }] }],
    ['a post that opens a data URL', { posts: [{ ...post, url: 'data:text/html,x' }] }],
    ['a home on another site', { siteUrl: 'https://evil.example/en' }],
    ['a blog on another site', { blogUrl: 'https://www.example.org.evil.example/en/blog' }],
    ['a project on another site', { projects: [{ ...project, url: 'https://evil.example/x' }] }],
    [
      'an icon that carries markup',
      { technologies: [{ ...technology, iconPath: 'M0 0"/><script>' }] },
    ],
    ['a colour that is not one', { technologies: [{ ...technology, color: 'red;}' }] }],
    ['a platform that is not a slug', { links: [{ ...link, platform: '../x' }] }],
    ['more posts than the profile shows', { posts: Array.from({ length: 6 }, () => post) }],
    [
      'a month that does not exist',
      { career: [{ ...SAMPLE_CONTENT.career[0], startDate: '2021-13' }] },
    ],
    ['a locale that is not a language code', { locale: 'en&x=1' }],
    ['a profile without a name', { profile: { ...profile, name: '' } }],
    ['a bio far too long', { profile: { ...profile, bio: 'x'.repeat(20_001) } }],
    [
      'a post that does not say whether its minutes count a video',
      { posts: [{ ...post, includesVideo: undefined }] },
    ],
    ['a headline of two lines', { profile: { ...profile, headline: 'one\n\n# two' } }],
    ['a name with a control character', { profile: { ...profile, name: 'Ada\u0000' } }],
    ['a technology named over two lines', { technologies: [{ ...technology, name: 'a\nb' }] }],
    ['a technology without its months', { technologies: [{ ...technology, months: undefined }] }],
    ['a technology of part of a month', { technologies: [{ ...technology, months: 2.5 }] }],
    ['a bio with a control character', { profile: { ...profile, bio: 'text\u001b[31m' } }],
    ['a terminal without https', { terminalUrl: 'http://terminal.example.org/en' }],
    ['a play site that runs a script', { playUrl: 'javascript:alert(1)' }],
    [
      'a picture that is not on the web',
      {
        profile: {
          ...profile,
          avatar: { url: 'file:///etc/passwd', alt: '', width: 1, height: 1 },
        },
      },
    ],
  ];
  for (const [what, change] of refused) {
    it(`refuses ${what}`, () => {
      assert.equal(schema.safeParse({ ...SAMPLE_CONTENT, ...change }).success, false);
    });
  }

  it('lets the bio keep its paragraphs', () => {
    assert.ok(
      schema.safeParse({ ...SAMPLE_CONTENT, profile: { ...profile, bio: 'one\n\ntwo\ttabbed' } })
        .success,
    );
  });
});

describe('HttpContentSource', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  function answer(response: Response) {
    return mock.method(globalThis, 'fetch', () => Promise.resolve(response));
  }

  const OTHER_SITES = {
    terminalOrigin: 'https://terminal.example.org',
    playOrigin: null,
  };
  const source = () => new HttpContentSource(ORIGIN, 'en', OTHER_SITES);

  it('asks the portfolio for the content in its locale, and follows no redirect', async () => {
    const fetched = answer(Response.json(SAMPLE_CONTENT));

    assert.deepEqual(await source().read(), SAMPLE_CONTENT);
    const [url, init] = fetched.mock.calls[0]?.arguments ?? [];
    assert.ok(url instanceof URL);
    assert.equal(url.href, 'https://www.example.org/api/github-profile/content?locale=en');
    assert.equal(init?.redirect, 'error');
  });

  it('takes the other sites from its configuration while the portfolio does not name them', async () => {
    answer(Response.json(olderContent()));

    const content = await source().read();

    assert.equal(content.terminalUrl, 'https://terminal.example.org/en');
    assert.equal(content.playUrl, null);
  });

  it('hides a site the portfolio hides, whatever its configuration says', async () => {
    answer(Response.json({ ...SAMPLE_CONTENT, terminalUrl: null }));

    assert.equal((await source().read()).terminalUrl, null);
  });

  it('fails when the portfolio does not answer the content', async () => {
    answer(new Response(null, { status: 503 }));

    await assert.rejects(source().read(), /The portfolio answered 503 for the content\./);
  });

  it('fails on a content that breaks the contract, saying where and never what', async () => {
    answer(Response.json({ ...SAMPLE_CONTENT, links: [{ ...link, url: 'javascript:alert(1)' }] }));

    await assert.rejects(source().read(), (error: Error) => {
      assert.equal(error.message, 'The content is not what the contract says at links.0.url.');
      return true;
    });
  });

  it('fails on an answer far larger than a profile, whether or not it says its size', async () => {
    answer(new Response('x'.repeat(2 * 1024 * 1024 + 1)));
    await assert.rejects(source().read(), /larger than a profile can need/);

    answer(new Response(null, { headers: { 'content-length': '999999999' } }));
    await assert.rejects(source().read(), /larger than a profile can need/);
  });

  it('refuses a content that names another site as its own', async () => {
    answer(Response.json({ ...SAMPLE_CONTENT, siteUrl: 'https://evil.example/en' }));

    await assert.rejects(source().read(), /not what the contract says at siteUrl\./);
  });
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const JPEG_DATA = 'data:image/jpeg;base64,/9j/4AAQ';

describe('HttpPictureSource', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  const answer = (response: Response) =>
    mock.method(globalThis, 'fetch', () => Promise.resolve(response));
  const pictures = () => new HttpPictureSource(ORIGIN, 'https://cdn.example.org');

  it('asks the CDN for a JPEG of that width, as a page of the portfolio would', async () => {
    const fetched = answer(new Response(JPEG));

    const picture = await pictures().read('https://cdn.example.org/ada.jpg?v=1', 320);

    assert.equal(picture, JPEG_DATA);
    const [url, init] = fetched.mock.calls[0]?.arguments ?? [];
    assert.ok(url instanceof URL);
    assert.equal(url.href, 'https://cdn.example.org/ada.jpg?v=1&w=320&fm=jpeg');
    assert.equal(init?.redirect, 'error');
    assert.deepEqual(init.headers, { accept: 'image/jpeg', referer: 'https://www.example.org/' });
  });

  it('never asks anywhere but the CDN of the portfolio', async () => {
    const fetched = answer(new Response(JPEG));

    await assert.rejects(pictures().read('https://evil.example/a.jpg', 320), /not on the CDN/);
    await assert.rejects(
      new HttpPictureSource(ORIGIN, null).read('https://cdn.example.org/a.jpg', 320),
      /not on the CDN/,
    );
    assert.equal(fetched.mock.callCount(), 0);
  });

  it('fails on anything that is not a JPEG, and on a missing picture', async () => {
    answer(new Response('<svg onload="alert(1)"/>'));
    await assert.rejects(pictures().read('https://cdn.example.org/a.jpg', 320), /not a JPEG/);

    answer(new Response(null, { status: 404 }));
    await assert.rejects(pictures().read('https://cdn.example.org/a.jpg', 320), /answered 404/);
  });
});

describe('DiskPreviewSource', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'previews-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reads the screenshot of a site, and none where there is none', async () => {
    await mkdir(join(root, 'previews'));
    await writeFile(join(root, 'previews', 'terminal.jpg'), JPEG);
    const previews = new DiskPreviewSource(root);

    assert.equal(await previews.read('terminal'), JPEG_DATA);
    assert.equal(await previews.read('play'), null);
  });

  it('refuses a screenshot that is not a JPEG', async () => {
    await mkdir(join(root, 'previews'));
    await writeFile(join(root, 'previews', 'play.jpg'), '<svg/>');

    await assert.rejects(new DiskPreviewSource(root).read('play'), /not a JPEG/);
  });
});

describe('DiskProfileStore', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'profile-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes a file, creating its folder, and reads it back', async () => {
    const store = new DiskProfileStore(root);

    await store.write('assets/banner-dark.svg', '<svg/>');

    assert.equal(await store.read('assets/banner-dark.svg'), '<svg/>');
    assert.equal(await readFile(join(root, 'assets', 'banner-dark.svg'), 'utf8'), '<svg/>');
    assert.equal(await store.read('README.md'), null);
  });

  it('lists the files of a folder and removes one', async () => {
    const store = new DiskProfileStore(root);
    await store.write('assets/one.svg', '1');
    await store.write('assets/two.svg', '2');
    await store.write('assets/nested/three.svg', '3');

    assert.deepEqual((await store.list('assets')).sort(), ['assets/one.svg', 'assets/two.svg']);
    await store.remove('assets/one.svg');
    assert.deepEqual(await store.list('assets'), ['assets/two.svg']);
    assert.deepEqual(await store.list('missing'), []);
  });

  it('never leaves its folder', async () => {
    const store = new DiskProfileStore(join(root, 'profile'));
    await writeFile(join(root, 'outside.txt'), 'kept');

    await assert.rejects(store.write('../outside.txt', 'overwritten'), /outside the profile/);
    await assert.rejects(store.read('/etc/hostname'), /outside the profile/);
    await assert.rejects(store.remove('../outside.txt'), /outside the profile/);
    assert.equal(await readFile(join(root, 'outside.txt'), 'utf8'), 'kept');
  });
});
