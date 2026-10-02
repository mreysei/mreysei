import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProfileFiles, README_PATH } from './profile-files.ts';
import { inline } from './readme.ts';
import { FORBIDDEN_IN_IMAGES, HOSTILE, SAMPLE_CONTENT } from '../testing/sample-content.ts';

const VIEWS = 'https://www.example.org/api/github-profile/views.svg';

function build(content = SAMPLE_CONTENT) {
  const files = buildProfileFiles(content, VIEWS);
  const readme = files.find((file) => file.path === README_PATH)?.content ?? '';
  return { files, readme, paths: files.map((file) => file.path) };
}

describe('buildProfileFiles', () => {
  it('writes the README and every image it shows', () => {
    const { paths, readme } = build();

    assert.deepEqual(paths, [
      'README.md',
      'assets/banner-dark.svg',
      'assets/banner-light.svg',
      'assets/link-site.svg',
      'assets/link-linkedin.svg',
      'assets/link-other.svg',
      'assets/stack-dark.svg',
      'assets/stack-light.svg',
      'assets/activity-dark.svg',
      'assets/activity-light.svg',
    ]);
    for (const path of paths.slice(1)) assert.ok(readme.includes(`"${path}"`), path);
  });

  it('gives the same files for the same content, byte for byte', () => {
    assert.deepEqual(build().files, build().files);
  });

  it('links the site first, then the profiles, and never GitHub from GitHub', () => {
    const { readme } = build();
    const links = [
      ...readme.matchAll(
        /<a href="([^"]+)"><img src="assets\/link-[^"]+" height="40" alt="([^"]+)">/g,
      ),
    ].map(([, url, alt]) => [url, alt]);

    assert.deepEqual(links, [
      ['https://www.example.org/en', 'www.example.org'],
      ['https://www.linkedin.com/in/ada', 'LinkedIn'],
      ['https://example.net/ada', 'Other'],
    ]);
  });

  it('numbers a second link of a platform, so no image overwrites another', () => {
    const [, , other] = SAMPLE_CONTENT.links;
    if (other === undefined) throw new Error('The sample has three links.');
    const { paths } = build({ ...SAMPLE_CONTENT, links: [other, other, other] });

    assert.deepEqual(
      paths.filter((path) => path.includes('link-other')),
      ['assets/link-other.svg', 'assets/link-other-2.svg', 'assets/link-other-3.svg'],
    );
  });

  it('shows the counter of views of the portfolio in each colour scheme and the language of the README', () => {
    const { readme } = build();

    assert.ok(
      readme.includes(
        `<source media="(prefers-color-scheme: light)" srcset="${VIEWS}?theme=light&amp;locale=en">`,
      ),
    );
    assert.ok(
      readme.includes(
        `<img src="${VIEWS}?theme=dark&amp;locale=en" height="28" alt="profile views counter">`,
      ),
    );
  });

  it('shows each image in the colour scheme of the reader, with a text to read instead', () => {
    const { readme } = build();

    assert.ok(
      readme.includes(
        [
          '<picture>',
          '  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.svg">',
          '  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">',
          '  <img src="assets/banner-dark.svg" width="100%" alt="Ada Example — Frontend Developer · Tokyo. I build fast websites. Currently at Example Labs.">',
          '</picture>',
        ].join('\n'),
      ),
    );
    assert.ok(readme.includes('alt="Technologies: TypeScript, TDD, Express"'));
    assert.ok(
      readme.includes('alt="1,677 contributions in the last year, 3,689 contributions since 2016,'),
    );
  });

  it('writes the sections with what the portfolio says', () => {
    const { readme } = build();

    // What the banner draws is also said as text, before the bio.
    assert.ok(
      readme.includes(
        [
          '## About',
          '',
          '**I build fast websites.**<br>',
          'Frontend Developer · Tokyo',
          '',
          'A **bio** in Markdown.',
          '',
          'With two paragraphs.',
          '',
        ].join('\n'),
      ),
    );
    assert.ok(
      readme.includes(
        [
          '## Latest posts',
          '',
          '- **[Code is not everything](https://www.example.org/en/blog/code-is-not-everything)**<br>',
          '  People come first.<br>',
          '  <sub>Jan 28, 2025 · 4 min read</sub>',
          '',
          '[Every post on the blog](https://www.example.org/en/blog) →',
        ].join('\n'),
      ),
    );
    assert.ok(
      readme.includes(
        [
          '## Projects',
          '',
          '- **[Decide](https://www.example.org/en/projects/decide)** <sub>Mobile app · 2024</sub><br>',
          '  An app that decides for you.',
        ].join('\n'),
      ),
    );
    assert.ok(
      readme.includes(
        [
          '## Career',
          '',
          '| When | What | Where |',
          '| --- | --- | --- |',
          '| Mar 2021 – Present | Frontend Developer | [Example Labs](https://labs.example.org/) |',
          '| Sep 2015 – Jun 2017 | Web Development | Example School |',
        ].join('\n'),
      ),
    );
    assert.ok(readme.endsWith('by a workflow of this repository.</sub>\n</div>\n'));
  });

  it('says that the minutes of a post with a video are of reading and watching', () => {
    const [post] = SAMPLE_CONTENT.posts;
    if (!post) throw new Error('The sample has a post.');
    const { readme } = build({
      ...SAMPLE_CONTENT,
      posts: [{ ...post, readingMinutes: 65, includesVideo: true }, post],
    });

    assert.ok(readme.includes('<sub>Jan 28, 2025 · 65 min to read and watch</sub>'));
    assert.ok(readme.includes('<sub>Jan 28, 2025 · 4 min read</sub>'));
  });

  it('leaves out the sections and the images that have nothing to show', () => {
    const { paths, readme } = build({
      ...SAMPLE_CONTENT,
      profile: { ...SAMPLE_CONTENT.profile, bio: '  ', headline: '', role: '', location: '' },
      links: [],
      career: [],
      technologies: [],
      posts: [],
      projects: [],
      activity: null,
    });

    assert.deepEqual(paths, [
      'README.md',
      'assets/banner-dark.svg',
      'assets/banner-light.svg',
      'assets/link-site.svg',
    ]);
    assert.doesNotMatch(readme, /^## /m);
    assert.doesNotMatch(readme, /stack|activity/);
  });

  it('says so when the owner is available for work', () => {
    const { readme } = build({
      ...SAMPLE_CONTENT,
      profile: { ...SAMPLE_CONTENT.profile, availableForWork: true },
    });

    assert.ok(
      readme.includes(
        '**Available for new projects.** Write to me from [www\\.example.org](https://www.example.org/en).',
      ),
    );
    assert.doesNotMatch(build().readme, /Available for new projects/);
  });

  it('writes every text of the content as text, in the README and in the images', () => {
    const [post] = SAMPLE_CONTENT.posts;
    const [project] = SAMPLE_CONTENT.projects;
    const [entry] = SAMPLE_CONTENT.career;
    const [link] = SAMPLE_CONTENT.links.slice(1);
    if (!post || !project || !entry || !link) throw new Error('The sample has every section.');
    const { files, readme } = build({
      ...SAMPLE_CONTENT,
      // The bio is the one Markdown of the owner; everything else is plain text.
      profile: { ...SAMPLE_CONTENT.profile, name: HOSTILE, role: HOSTILE, headline: HOSTILE },
      links: [{ ...link, name: HOSTILE }],
      posts: [{ ...post, title: HOSTILE, excerpt: HOSTILE }],
      projects: [{ ...project, name: HOSTILE, tagline: HOSTILE }],
      career: [{ ...entry, title: HOSTILE, organization: HOSTILE }],
      technologies: SAMPLE_CONTENT.technologies.map((technology) => ({
        ...technology,
        name: HOSTILE,
      })),
    });

    // Inside an attribute a text is only text; everywhere else it is Markdown.
    const markdown = readme.replace(/alt="[^"]*"/g, '');
    const row = markdown.split('\n').find((line) => line.startsWith('| Mar 2021')) ?? '';

    assert.doesNotMatch(readme, /<script/);
    assert.doesNotMatch(markdown, /(?<!\\)\]\(javascript:/);
    assert.doesNotMatch(markdown, /(?<!\\)`/);
    assert.equal(row.match(/(?<!\\)\|/g)?.length, 4, 'a pipe of a text adds no column');
    assert.ok(readme.includes(inline(HOSTILE)));
    for (const file of files.slice(1))
      assert.doesNotMatch(file.content, FORBIDDEN_IN_IMAGES, file.path);
  });
});

describe('the bio', () => {
  it('stays Markdown and loses its HTML, so no tag or comment swallows the README', () => {
    const { readme } = build({
      ...SAMPLE_CONTENT,
      profile: {
        ...SAMPLE_CONTENT.profile,
        bio: 'A **bio** with a [link](https://example.org).\n\n<details><summary>x</summary>\n\n<!-- hidden',
      },
    });

    assert.ok(readme.includes('A **bio** with a [link](https://example.org).'));
    assert.ok(readme.includes('&lt;details>&lt;summary>x&lt;/summary>'));
    assert.doesNotMatch(readme, /<details|<!-- hidden/);
    assert.ok(readme.includes('## Latest posts'));
  });
});

describe('inline', () => {
  it('escapes what Markdown and HTML would read as markup, on one line', () => {
    assert.equal(
      inline('a *b* _c_ [d](e) <f> g|h `i` ~j~ \\k &\nl'),
      'a \\*b\\* \\_c\\_ \\[d\\](e) &lt;f&gt; g\\|h \\`i\\` \\~j\\~ \\\\k &amp; l',
    );
  });

  it('never starts a heading, a list or a rule', () => {
    assert.equal(inline('# Heading'), '\\# Heading');
    assert.equal(inline('- item'), '\\- item');
    assert.equal(inline('+ item'), '\\+ item');
    assert.equal(inline('=== rule'), '\\=== rule');
    assert.equal(inline('1. first'), '1\\. first');
    assert.equal(inline('2) second'), '2\\) second');
    assert.equal(inline('C# and .NET - 2024'), 'C# and .NET - 2024');
  });

  it('never becomes a link on its own', () => {
    assert.equal(inline('see https://evil.example/x'), 'see https\\://evil.example/x');
    assert.equal(inline('at www.evil.example'), 'at www\\.evil.example');
    assert.equal(inline('write to me@evil.example'), 'write to me\\@evil.example');
  });
});
