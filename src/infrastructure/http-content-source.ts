import type { ContentSource } from '../application/sync-profile.ts';
import type { ProfileContent } from '../domain/content.ts';
import { profileContentSchema } from './content-schema.ts';

const CONTENT_PATH = '/api/github-profile/content';
const TIMEOUT_MS = 20_000;
/** The whole content is a few dozen kilobytes; anything far larger is not it. */
const MAX_BYTES = 2 * 1024 * 1024;

const tooLarge = () => new Error('The answer is larger than a profile can need.');

/** The body, read no further than the limit: a huge answer is dropped, not buffered. */
export async function readUpTo(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes) throw tooLarge();
  if (response.body === null) return new Uint8Array();
  const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let read = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.byteLength;
    if (read > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Where the terminal and the play site are when the portfolio does not say it. */
export interface OtherSites {
  terminalOrigin: string | null;
  playOrigin: string | null;
}

/** Reads the content from a portfolio, in one locale. */
export class HttpContentSource implements ContentSource {
  private readonly siteOrigin: string;
  private readonly locale: string;
  private readonly otherSites: OtherSites;

  constructor(siteOrigin: string, locale: string, otherSites: OtherSites) {
    this.siteOrigin = siteOrigin;
    this.locale = locale;
    this.otherSites = otherSites;
  }

  /** The site in the locale, as the footer of the portfolio links it. */
  private inLocale(origin: string | null): string | null {
    return origin === null ? null : `${origin}/${this.locale}`;
  }

  async read(): Promise<ProfileContent> {
    const url = new URL(CONTENT_PATH, this.siteOrigin);
    url.searchParams.set('locale', this.locale);
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      // The address is the portfolio's own: an answer from anywhere else is not its content.
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`The portfolio answered ${String(response.status)} for the content.`);
    }

    const answer: unknown = JSON.parse(
      new TextDecoder().decode(await readUpTo(response, MAX_BYTES)),
    );
    const parsed = profileContentSchema(this.siteOrigin).safeParse(answer);
    if (!parsed.success) {
      // Where it breaks the contract, never the values.
      const paths = new Set(parsed.error.issues.map((issue) => issue.path.join('.') || '(root)'));
      throw new Error(
        `The content is not what the contract says at ${[...paths].slice(0, 5).join(', ')}.`,
      );
    }
    const { terminalUrl, playUrl, ...content } = parsed.data;
    return {
      ...content,
      terminalUrl:
        terminalUrl === undefined ? this.inLocale(this.otherSites.terminalOrigin) : terminalUrl,
      playUrl: playUrl === undefined ? this.inLocale(this.otherSites.playOrigin) : playUrl,
    };
  }
}
