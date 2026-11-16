import { chromium, type Page } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Site } from './domain/profile-files.ts';
import { originOf, otherSitesOf } from './environment.ts';
import { PREVIEWS_FOLDER } from './infrastructure/disk-preview-source.ts';
import { HttpContentSource } from './infrastructure/http-content-source.ts';

/**
 * Takes the screenshots the buttons of the sites show, from the sites the content of the
 * portfolio names, into `previews/`. Run by hand when a site changes its look, never by the
 * daily sync: two screenshots of one page are never equal byte for byte, and the profile must
 * not change while nothing new happened. See docs/SYNC.md.
 */

/** Twice the size of a button (280 x 190), so it is sharp on a dense screen. */
const SHOT = { width: 560, height: 380 };
/** How wide each site is seen: the terminal is a narrower window, or it would be mostly empty. */
const SEEN_WIDTH: Readonly<Record<Site, number>> = { portfolio: 1120, terminal: 840, play: 1120 };
/** The play site follows the reader's clock: it is shown by day, at noon in Japan. */
const NOON = new Date('2026-01-15T12:00:00+09:00');
/** Long enough for the terminal to answer its first command and the house to be drawn. */
const SETTLE_MS = 4000;
const JPEG_QUALITY = 72;

/** The notice of the statistics would cover the portfolio: it is answered "no". */
async function dismissConsent(page: Page): Promise<void> {
  const reject = page.getByRole('button', { name: 'Reject', exact: true });
  if (await reject.isVisible()) await reject.click();
}

async function capture(site: Site, url: string, folder: string): Promise<void> {
  const width = SEEN_WIDTH[site];
  const scale = SHOT.width / width;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width, height: Math.round(SHOT.height / scale) },
      deviceScaleFactor: scale,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    await page.clock.setFixedTime(NOON);
    await page.goto(url, { waitUntil: 'networkidle' });
    await dismissConsent(page);
    await page.waitForTimeout(SETTLE_MS);
    // Answering the notice moves the page: the screenshot is of its top.
    // A string: the program has no types of the browser, where this runs.
    await page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
    await page.waitForTimeout(500);
    const path = join(folder, `${site}.jpg`);
    await writeFile(path, await page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY }));
    console.log(`written  ${path}`);
  } finally {
    await browser.close();
  }
}

try {
  const siteOrigin = originOf('PROFILE_SITE_URL', process.env.PROFILE_SITE_URL);
  const content = await new HttpContentSource(siteOrigin, 'en', otherSitesOf(process.env)).read();
  const folder = join(process.cwd(), PREVIEWS_FOLDER);
  await mkdir(folder, { recursive: true });
  const sites: [Site, string | null][] = [
    ['portfolio', content.siteUrl],
    ['terminal', content.terminalUrl],
    ['play', content.playUrl],
  ];
  for (const [site, url] of sites) {
    if (url !== null) await capture(site, url, folder);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'The previews could not be taken.');
  process.exitCode = 1;
}
