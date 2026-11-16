import type { ProfileContent, Technology } from '../domain/content.ts';

/** A content with every section, for the tests: never a real one. */

export const TYPESCRIPT: Technology = {
  slug: 'typescript',
  name: 'TypeScript',
  color: '#3178c6',
  iconPath: 'M0 0h24v24H0z',
};

const technologyOf = (name: string, color: string | null = null): Technology => ({
  slug: name.toLowerCase(),
  name,
  color,
  iconPath: null,
});

export const SAMPLE_CONTENT: ProfileContent = {
  locale: 'en',
  siteUrl: 'https://www.example.org/en',
  blogUrl: 'https://www.example.org/en/blog',
  projectsUrl: 'https://www.example.org/en/projects',
  terminalUrl: 'https://terminal.example.org/en',
  playUrl: 'https://play.example.org/en',
  postCount: 7,
  projectCount: 16,
  profile: {
    name: 'Ada Example',
    handle: 'ada',
    role: 'Frontend Developer',
    headline: 'I build fast websites.',
    bio: 'A **bio** in Markdown.\n\nWith two paragraphs.',
    location: 'Tokyo',
    availableForWork: false,
    avatar: { url: 'https://cdn.example.org/ada.jpg', alt: 'Ada', width: 600, height: 600 },
    banner: null,
  },
  links: [
    {
      platform: 'github',
      name: 'GitHub',
      url: 'https://github.com/ada',
      handle: 'ada',
      iconPath: 'M1 1h22v22H1z',
    },
    {
      platform: 'linkedin',
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/ada',
      handle: 'ada',
      iconPath: 'M2 2h20v20H2z',
    },
    {
      platform: 'other',
      name: 'Other',
      url: 'https://example.net/ada',
      handle: '',
      iconPath: null,
    },
  ],
  career: [
    {
      kind: 'company',
      organization: 'Example Labs',
      organizationUrl: 'https://labs.example.org/',
      title: 'Frontend Developer',
      location: 'Remote',
      startDate: '2021-03',
      endDate: null,
    },
    {
      kind: 'education',
      organization: 'Example School',
      organizationUrl: null,
      title: 'Web Development',
      location: '',
      startDate: '2015-09',
      endDate: '2017-06',
    },
  ],
  technologies: [
    { ...TYPESCRIPT, months: 60 },
    { ...technologyOf('TDD'), months: 30 },
    { ...technologyOf('Express', '#0a0a0a'), months: 8 },
  ],
  posts: [
    {
      title: 'Code is not everything',
      excerpt: 'People come first.',
      url: 'https://www.example.org/en/blog/code-is-not-everything',
      publishedAt: '2025-01-28T12:00:00.000Z',
      readingMinutes: 4,
      includesVideo: false,
    },
  ],
  projects: [
    {
      name: 'Decide',
      tagline: 'An app that decides for you.',
      url: 'https://www.example.org/en/projects/decide',
      kind: 'mobile-app',
      year: 2024,
    },
  ],
  activity: {
    totalContributions: 1677,
    range: { from: '2025-09-28', to: '2026-09-28' },
    longestStreak: { days: 15, from: '2026-08-31', to: '2026-09-14' },
    currentStreak: { days: 3, from: '2026-09-26', to: '2026-09-28' },
    publicRepositories: 12,
    privateRepositories: 7,
    topTechnologies: [
      { technology: technologyOf('CSS'), percentage: 16 },
      { technology: technologyOf('JavaScript'), percentage: 62.4 },
      { technology: TYPESCRIPT, percentage: 9.4 },
      { technology: technologyOf('Java'), percentage: 4.3 },
      { technology: technologyOf('Dart'), percentage: 4 },
      { technology: technologyOf('Kotlin'), percentage: 3.9 },
    ],
    allTime: {
      contributions: 3689,
      years: [
        { year: 2016, contributions: 12 },
        { year: 2026, contributions: 1500 },
      ],
    },
  },
};

/** Texts that try to be markup, wherever a text can be. */
export const HOSTILE = '<script>alert(1)</script> & "quotes" [link](javascript:alert(1)) | `code`';

/** The smallest start of a JPEG, as the sources of pictures hand it over. */
export const SAMPLE_PICTURE = 'data:image/jpeg;base64,/9j/4AAQ';

/** Nothing an image may carry: scripts, style hooks, or anything loaded from elsewhere. */
export const FORBIDDEN_IN_IMAGES = /<script|<foreignObject|<image|<iframe|href=|@import|\bon\w+=/i;

/**
 * The image without the pictures written inside it, the one thing it may embed: a JPEG as a
 * `data:` address. What is left must not match `FORBIDDEN_IN_IMAGES`.
 */
export const withoutPictures = (svg: string) =>
  svg.replace(/<image [^>]*href="data:image\/jpeg;base64,[A-Za-z0-9+/=]+"\/>/g, '');
