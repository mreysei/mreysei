import type { ContentSource } from '../application/sync-profile.ts';
import type { ProfileContent } from '../domain/content.ts';
import { profileContentSchema } from './content-schema.ts';

const CONTENT_PATH = '/api/github-profile/content';
const TIMEOUT_MS = 20_000;
/** The whole content is a few dozen kilobytes; anything far larger is not it. */
const MAX_BYTES = 2 * 1024 * 1024;

const tooLarge = () => new Error('The content is larger than a profile can be.');

/** The body as text, read no further than the limit: a huge answer is dropped, not buffered. */
async function readUpTo(response: Response, maxBytes: number): Promise<string> {
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes) throw tooLarge();
  if (response.body === null) return '';
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
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Reads the content from a portfolio, in one locale. */
export class HttpContentSource implements ContentSource {
  private readonly siteOrigin: string;
  private readonly locale: string;

  constructor(siteOrigin: string, locale: string) {
    this.siteOrigin = siteOrigin;
    this.locale = locale;
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

    const answer: unknown = JSON.parse(await readUpTo(response, MAX_BYTES));
    const parsed = profileContentSchema(this.siteOrigin).safeParse(answer);
    if (!parsed.success) {
      // Where it breaks the contract, never the values.
      const paths = new Set(parsed.error.issues.map((issue) => issue.path.join('.') || '(root)'));
      throw new Error(
        `The content is not what the contract says at ${[...paths].slice(0, 5).join(', ')}.`,
      );
    }
    return parsed.data;
  }
}
