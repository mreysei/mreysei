/**
 * What the profile is written from, as the portfolio serves it at
 * `/api/github-profile/content`: `GithubProfileContent` in `docs/contract.ts` of the platform's
 * workspace repository, which is the source of truth. Texts come in one locale.
 */

export const CAREER_KINDS = ['education', 'freelance', 'company'] as const;
export type CareerKind = (typeof CAREER_KINDS)[number];

export const PROJECT_KINDS = ['web', 'mobile-app', 'desktop-app', 'library', 'other'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export interface Technology {
  slug: string;
  name: string;
  /** Brand colour as `#rrggbb`, or null. Never relied on for contrast. */
  color: string | null;
  /** Path data of a single-path logo in a 24 x 24 box, or null. */
  iconPath: string | null;
}

export interface ProfileLink {
  /** A slug of lowercase letters and digits, such as `linkedin`: the platforms are the portfolio's to name. */
  platform: string;
  /** Name of the platform, such as `GitHub`. */
  name: string;
  url: string;
  handle: string;
  /** Path data of the icon in a 24 x 24 box, or null. */
  iconPath: string | null;
}

export interface CareerEntry {
  kind: CareerKind;
  organization: string;
  organizationUrl: string | null;
  /** Job title or degree. */
  title: string;
  location: string;
  /** `YYYY-MM`. */
  startDate: string;
  /** `YYYY-MM`, or null while it goes on. */
  endDate: string | null;
}

export interface Post {
  title: string;
  excerpt: string;
  url: string;
  /** UTC instant. */
  publishedAt: string;
  /** Whole minutes the post takes: reading its text and, with a video, watching it. */
  readingMinutes: number;
  /** True when the minutes count a video: they are then not only of reading. */
  includesVideo: boolean;
}

export interface Project {
  name: string;
  tagline: string;
  url: string;
  kind: ProjectKind;
  year: number;
}

export interface Streak {
  days: number;
  from: string | null;
  to: string | null;
}

export interface Activity {
  /** Contributions of the last 53 weeks. */
  totalContributions: number;
  range: { from: string; to: string };
  longestStreak: Streak;
  currentStreak: Streak;
  publicRepositories: number;
  /** Shares of the code of the owner's repositories, 0 to 100. */
  topTechnologies: { technology: Technology; percentage: number }[];
  /** Every contribution by calendar year, oldest first; null until it was counted. */
  allTime: { contributions: number; years: { year: number; contributions: number }[] } | null;
}

export interface ProfileContent {
  locale: string;
  /** Home of the portfolio in that locale. */
  siteUrl: string;
  blogUrl: string;
  profile: {
    name: string;
    handle: string;
    role: string;
    headline: string;
    /** Markdown. */
    bio: string;
    location: string;
    availableForWork: boolean;
  };
  /** The owner's public profiles on other websites. */
  links: ProfileLink[];
  /** Most recent first. */
  career: CareerEntry[];
  /** The most recently used first. */
  technologies: Technology[];
  /** Newest first. */
  posts: Post[];
  projects: Project[];
  activity: Activity | null;
}
