import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  describeActivity,
  figuresOf,
  languageSharesOf,
  phraseOf,
  renderActivity,
} from './activity.ts';
import { renderBanner } from './banner.ts';
import { renderLinkBadge } from './link-badge.ts';
import {
  FORBIDDEN_IN_IMAGES,
  HOSTILE,
  SAMPLE_CONTENT,
  TYPESCRIPT,
} from '../testing/sample-content.ts';
import { renderStack } from './stack.ts';
import { PALETTES, THEMES } from './theme.ts';

const activity = SAMPLE_CONTENT.activity;
if (activity === null) throw new Error('The sample has activity.');

const textsOf = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(([, text]) => text);

describe('renderBanner', () => {
  it('asks the terminal who the owner is, and it answers', () => {
    const svg = renderBanner(SAMPLE_CONTENT, 'dark');

    assert.deepEqual(textsOf(svg), [
      'ada — zsh',
      '$',
      'whoami',
      'Ada Example',
      'Frontend Developer · Tokyo',
      '$',
      'cat headline.txt',
      'I build fast websites.',
      '$',
      'ls work/',
      'Example Labs',
      '$',
    ]);
    assert.match(
      svg,
      /aria-label="Ada Example — Frontend Developer · Tokyo. I build fast websites. Currently at Example Labs."/,
    );
  });

  it('leaves out what the owner has not written, and work that ended or is a school', () => {
    const svg = renderBanner(
      {
        ...SAMPLE_CONTENT,
        profile: { ...SAMPLE_CONTENT.profile, headline: '', role: '', location: '' },
        career: SAMPLE_CONTENT.career.map((entry) =>
          entry.kind === 'education'
            ? { ...entry, endDate: null }
            : { ...entry, endDate: '2024-01' },
        ),
      },
      'light',
    );

    assert.deepEqual(textsOf(svg), ['ada — zsh', '$', 'whoami', 'Ada Example', '$']);
    assert.match(svg, /aria-label="Ada Example\."/);
  });

  it('wears the colours of each scheme', () => {
    for (const theme of THEMES) {
      assert.ok(renderBanner(SAMPLE_CONTENT, theme).includes(`fill="${PALETTES[theme].surface}"`));
    }
    assert.notEqual(renderBanner(SAMPLE_CONTENT, 'dark'), renderBanner(SAMPLE_CONTENT, 'light'));
  });

  it('stops moving before five seconds, and never moves for who asked for less motion', () => {
    const svg = renderBanner(SAMPLE_CONTENT, 'dark');
    const delays = [...svg.matchAll(/animation-delay:([\d.]+)s/g)].map(([, delay]) =>
      Number(delay),
    );
    const blink = Number(/blink ([\d.]+)s/.exec(svg)?.[1]);
    const blinks = Number(/animation-iteration-count:1,(\d+)/.exec(svg)?.[1]);
    const end = Math.max(...delays) + blink * blinks;

    assert.ok(delays.length > 0 && blink > 0 && blinks > 0);
    assert.ok(end < 5, `ends at ${String(end)} s`);
    assert.match(
      svg,
      /@media \(prefers-reduced-motion:reduce\)\{\.cover,\.shown,\.cursor\{animation:none\}\}/,
    );
    assert.doesNotMatch(svg, /infinite/);
  });

  it('draws everything where animations do not run: they only hide what is already there', () => {
    const svg = renderBanner(SAMPLE_CONTENT, 'dark');

    assert.match(svg, /\.cover\{opacity:0;/);
    // Also where the style sheet of the image is ignored: the covers never hide the commands.
    assert.equal(svg.split('class="cover" opacity="0"').length - 1, 3);
    assert.match(svg, /@keyframes show\{from\{opacity:0\}\}/);
    assert.doesNotMatch(svg, /\.shown\{[^}]*opacity:0/);
  });

  it('gives a long headline a second line, and cuts what is longer than that', () => {
    const svg = renderBanner(
      { ...SAMPLE_CONTENT, profile: { ...SAMPLE_CONTENT.profile, headline: 'word '.repeat(60) } },
      'dark',
    );
    const headline = textsOf(svg).filter((text) => text?.startsWith('word'));

    assert.equal(headline.length, 2);
    assert.ok(headline[1]?.endsWith('…'));
    assert.ok(headline.every((line) => (line?.length ?? 0) < 80));
  });
});

describe('renderLinkBadge', () => {
  it('writes the label next to its icon', () => {
    const svg = renderLinkBadge({
      label: 'LinkedIn',
      icon: { kind: 'path', path: 'M2 2h20' },
      primary: false,
    });

    assert.deepEqual(textsOf(svg), ['LinkedIn']);
    assert.match(svg, /d="M2 2h20"/);
    assert.match(svg, /aria-label="LinkedIn"/);
    assert.match(svg, /height="40"/);
  });

  it('is narrower without an icon, and wears the violet of the logo when it leads to the site', () => {
    const widthOf = (svg: string) => Number(/ width="(\d+)"/.exec(svg)?.[1]);
    const plain = renderLinkBadge({ label: 'Other', icon: { kind: 'none' }, primary: false });
    const withIcon = renderLinkBadge({
      label: 'Other',
      icon: { kind: 'path', path: 'M0 0' },
      primary: false,
    });
    const site = renderLinkBadge({
      label: 'www.example.org',
      icon: { kind: 'logo' },
      primary: true,
    });

    assert.ok(widthOf(plain) < widthOf(withIcon));
    assert.match(site, /stroke="#6342f6"/);
    assert.doesNotMatch(plain, /stroke="#6342f6"/);
  });
});

describe('renderStack', () => {
  it('writes every technology, with its logo when it has one', () => {
    const svg = renderStack(SAMPLE_CONTENT.technologies, 'dark');

    assert.deepEqual(textsOf(svg), ['TypeScript', 'TDD', 'Express']);
    assert.equal(svg.match(/<path /g)?.length, 1);
    assert.match(svg, /aria-label="TypeScript, TDD, Express"/);
  });

  it('draws a logo in its brand colour only where it stands out', () => {
    const dark = { ...TYPESCRIPT, name: 'Dark', color: '#0a0a0a' };

    assert.match(renderStack([TYPESCRIPT], 'dark'), /<path [^>]*fill="#3178c6"/);
    assert.match(
      renderStack([dark], 'dark'),
      new RegExp(`<path [^>]*fill="${PALETTES.dark.text}"`),
    );
    assert.match(renderStack([dark], 'light'), /<path [^>]*fill="#0a0a0a"/);
  });

  it('wraps into rows that fit the width of a README', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      ...TYPESCRIPT,
      name: `Technology ${String(index)}`,
    }));
    const svg = renderStack(many, 'light');
    const edges = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)].map(
      ([, x, width]) => [Number(x), Number(x) + Number(width)],
    );

    assert.equal(edges.length, 40);
    assert.ok(edges.every(([left, right]) => (left ?? -1) >= 0 && (right ?? 999) <= 880));
    assert.ok(Number(/ height="(\d+)"/.exec(svg)?.[1]) > 32);
  });
});

describe('the activity card', () => {
  it('reads each figure as a phrase', () => {
    assert.deepEqual(figuresOf(activity).map(phraseOf), [
      '1,677 contributions in the last year',
      '3,689 contributions since 2016',
      '15 days in the longest streak',
      '12 public repositories on GitHub',
    ]);
  });

  it('has no figure since the first year until every year was counted', () => {
    assert.deepEqual(
      figuresOf({ ...activity, allTime: null }).map(({ label, detail }) => `${label} ${detail}`),
      [
        'contributions in the last year',
        'days in the longest streak',
        'public repositories on GitHub',
      ],
    );
  });

  it('names the four languages with the most code, largest first, and puts the rest together', () => {
    assert.deepEqual(languageSharesOf(activity), [
      { name: 'JavaScript', percentage: 62.4, slot: 0 },
      { name: 'CSS', percentage: 16, slot: 1 },
      { name: 'TypeScript', percentage: 9.4, slot: 2 },
      { name: 'Java', percentage: 4.3, slot: 3 },
      { name: 'Other', percentage: 7.9, slot: null },
    ]);
  });

  it('leaves out slivers, the rest when it is one, and the bar without languages', () => {
    const one = { ...activity, topTechnologies: [{ technology: TYPESCRIPT, percentage: 99.6 }] };
    const none = { ...activity, topTechnologies: [{ technology: TYPESCRIPT, percentage: 0.4 }] };

    assert.deepEqual(languageSharesOf(one), [{ name: 'TypeScript', percentage: 99.6, slot: 0 }]);
    assert.deepEqual(languageSharesOf(none), []);
    assert.doesNotMatch(renderActivity(none, 'dark'), /clip-path/);
  });

  it('draws the figures, the bar in the chart colours and a legend in the colour of text', () => {
    const svg = renderActivity(activity, 'dark');
    const { chart, text, border } = PALETTES.dark;

    assert.deepEqual(textsOf(svg).slice(0, 3), ['1,677', 'contributions', 'in the last year']);
    assert.deepEqual(textsOf(svg).slice(-5), [
      'JavaScript 62.4%',
      'CSS 16%',
      'TypeScript 9.4%',
      'Java 4.3%',
      'Other 7.9%',
    ]);
    for (const color of [...chart, border])
      assert.equal(svg.split(`fill="${color}"`).length - 1, 2);
    assert.match(svg, new RegExp(`fill="${text}">JavaScript 62.4%<`));
  });

  it('says in words what it shows', () => {
    assert.equal(
      describeActivity(activity),
      '1,677 contributions in the last year, 3,689 contributions since 2016, 15 days in the longest streak, 12 public repositories on GitHub. Languages: JavaScript 62.4%, CSS 16%, TypeScript 9.4%, Java 4.3%, Other 7.9%',
    );
  });
});

describe('every image', () => {
  const hostile = {
    ...SAMPLE_CONTENT,
    profile: {
      ...SAMPLE_CONTENT.profile,
      name: HOSTILE,
      role: HOSTILE,
      headline: HOSTILE,
      handle: HOSTILE,
    },
    technologies: [{ ...TYPESCRIPT, name: HOSTILE }],
  };
  const images = THEMES.flatMap((theme) => [
    renderBanner(hostile, theme),
    renderStack(hostile.technologies, theme),
    renderActivity(
      {
        ...activity,
        topTechnologies: [{ technology: { ...TYPESCRIPT, name: HOSTILE }, percentage: 90 }],
      },
      theme,
    ),
    renderLinkBadge({ label: HOSTILE, icon: { kind: 'logo' }, primary: true }),
  ]);

  it('writes texts as text, never as markup', () => {
    for (const svg of images) {
      assert.doesNotMatch(svg, FORBIDDEN_IN_IMAGES);
      assert.ok(svg.includes('&lt;script&gt;'));
    }
  });

  it('loads nothing from anywhere: every reference stays inside the image', () => {
    for (const svg of images) {
      for (const [reference] of svg.matchAll(/url\([^)]*\)/g))
        assert.match(reference, /^url\(#\w+\)$/);
      assert.equal(svg.split('http').length - 1, 1, 'only the namespace of SVG');
    }
  });
});
