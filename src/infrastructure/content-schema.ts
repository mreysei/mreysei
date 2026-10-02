import { z } from 'zod';
import { CAREER_KINDS, PROJECT_KINDS, type ProfileContent } from '../domain/content.ts';

/**
 * What the portfolio answers, checked before a byte of it is written: the README and its images
 * end up on a public profile. The rules are the ones of `docs/contract.ts` of the platform, and
 * stricter where a profile needs less.
 */

/** A line break, a tab or any other control character: none belongs in a text of one line. */
const CONTROL_CHARACTER = /\p{Cc}/u;
/** The same, except the line breaks and tabs that Markdown is written with. */
const CONTROL_CHARACTER_OF_MARKDOWN = /(?![\t\n\r])\p{Cc}/u;

/** A text of one line. A line break would end the HTML it is written in and start Markdown. */
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !CONTROL_CHARACTER.test(value), 'Must be a single line of text.');

const markdown = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !CONTROL_CHARACTER_OF_MARKDOWN.test(value), 'Must be text.');

/** Without a user, a password or a port: an address that is what it looks like. */
function isPlainAddress(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.username === '' && url.password === '' && url.port === '';
}

/**
 * A page on another website, opened by readers of the profile: https on a public domain, never
 * `javascript:`, `data:`, an IP address or an address that hides where it leads.
 */
const externalUrl = z
  .url({ protocol: /^https$/, hostname: z.regexes.domain })
  .max(2048)
  .refine(isPlainAddress, 'Must not carry credentials or a port.');

/** Path data only (commands, numbers, separators): it is written inside an image. */
const iconPath = z
  .string()
  .max(20_000)
  .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/);
const count = z.number().int().nonnegative();
const isoDay = z.iso.date();
const isoMonth = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/);

const technology = z.object({
  slug: text(40),
  name: text(80).min(1),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/)
    .nullable(),
  iconPath: iconPath.nullable(),
});

const streak = z.object({ days: count, from: isoDay.nullable(), to: isoDay.nullable() });

/**
 * The schema of the content of one portfolio. Its own pages must be on the origin the content
 * was asked from: the answer cannot send readers of the profile anywhere else in its name.
 */
export function profileContentSchema(siteOrigin: string) {
  const ownPage = z
    .string()
    .max(2048)
    .refine(
      (value) => URL.canParse(value) && new URL(value).origin === siteOrigin,
      'Must be a page of the portfolio.',
    );

  return z.object({
    // A language code and a slug: the languages and platforms are the portfolio's to name.
    locale: z.string().regex(/^[a-z]{2}$/),
    siteUrl: ownPage,
    blogUrl: ownPage,
    profile: z.object({
      name: text(120).min(1),
      handle: text(120),
      role: text(200),
      headline: text(400),
      bio: markdown(20_000),
      location: text(200),
      availableForWork: z.boolean(),
    }),
    links: z
      .array(
        z.object({
          platform: z
            .string()
            .max(40)
            .regex(/^[a-z0-9]+$/),
          name: text(80).min(1),
          url: externalUrl,
          handle: text(200),
          iconPath: iconPath.nullable(),
        }),
      )
      .max(50),
    career: z
      .array(
        z.object({
          kind: z.enum(CAREER_KINDS),
          organization: text(200),
          organizationUrl: externalUrl.nullable(),
          title: text(200),
          location: text(200),
          startDate: isoMonth,
          endDate: isoMonth.nullable(),
        }),
      )
      .max(100),
    technologies: z.array(technology).max(300),
    posts: z
      .array(
        z.object({
          title: text(300).min(1),
          excerpt: text(1000),
          // Its page here, or the article of a post that was published elsewhere.
          url: z.union([ownPage, externalUrl]),
          publishedAt: z.iso.datetime(),
          readingMinutes: count,
        }),
      )
      .max(5),
    projects: z
      .array(
        z.object({
          name: text(200).min(1),
          tagline: text(400),
          url: ownPage,
          kind: z.enum(PROJECT_KINDS),
          year: z.number().int().min(1970).max(2100),
        }),
      )
      .max(6),
    activity: z
      .object({
        totalContributions: count,
        range: z.object({ from: isoDay, to: isoDay }),
        longestStreak: streak,
        currentStreak: streak,
        publicRepositories: count,
        topTechnologies: z
          .array(z.object({ technology, percentage: z.number().min(0).max(100) }))
          .max(300),
        allTime: z
          .object({
            contributions: count,
            years: z
              .array(z.object({ year: z.number().int().min(2008).max(2100), contributions: count }))
              .max(40),
          })
          .nullable(),
      })
      .nullable(),
  }) satisfies z.ZodType<ProfileContent>;
}
