import type { PictureSource } from '../application/sync-profile.ts';
import { readUpTo } from './http-content-source.ts';
import { jpegDataUrl } from './jpeg.ts';

const TIMEOUT_MS = 20_000;
/** A photo a thousand pixels wide is about a hundred kilobytes. */
const MAX_BYTES = 600 * 1024;

/** Reads the pictures of the portfolio from its CDN, as JPEG at the width asked for. */
export class HttpPictureSource implements PictureSource {
  private readonly siteOrigin: string;
  private readonly cdnOrigin: string | null;

  /** Without a CDN, no picture is read: the portfolio names where they are, not this program. */
  constructor(siteOrigin: string, cdnOrigin: string | null) {
    this.siteOrigin = siteOrigin;
    this.cdnOrigin = cdnOrigin;
  }

  async read(url: string, width: number): Promise<string> {
    const address = new URL(url);
    // The address comes from the portfolio's answer: only its CDN is ever asked, with its name.
    if (address.origin !== this.cdnOrigin) {
      throw new Error(
        'A picture of the profile is not on the CDN of the portfolio (PROFILE_CDN_URL).',
      );
    }
    address.searchParams.set('w', String(width));
    address.searchParams.set('fm', 'jpeg');
    const response = await fetch(address, {
      // The CDN serves the pictures of the portfolio only to its pages, which is where the
      // profile takes them from: it asks as the portfolio's home page.
      headers: { accept: 'image/jpeg', referer: `${this.siteOrigin}/` },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`The CDN answered ${String(response.status)} for a picture of the profile.`);
    }
    return jpegDataUrl(await readUpTo(response, MAX_BYTES), MAX_BYTES, 'A picture of the profile');
  }
}
