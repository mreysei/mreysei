import { makeSyncProfile } from './application/sync-profile.ts';
import { DiskProfileStore } from './infrastructure/disk-profile-store.ts';
import { HttpContentSource } from './infrastructure/http-content-source.ts';

/** The README is written in English, the language of GitHub; the site has the other two. */
const LOCALE = 'en';
const VIEWS_IMAGE_PATH = '/api/github-profile/views.svg';

/** The origin of a site named in the environment: no host is written in the program. */
function originOf(variable: string, value: string | undefined): string {
  if (value === undefined || !URL.canParse(value)) {
    throw new Error(
      `${variable} must be the address of the portfolio, such as https://www.example.org.`,
    );
  }
  return new URL(value).origin;
}

/** The composition root: the only place that knows the adapters and the configuration. */
function compose() {
  const { PROFILE_SITE_URL, PROFILE_VIEWS_SITE_URL, PROFILE_FOLDER } = process.env;
  const siteOrigin = originOf('PROFILE_SITE_URL', PROFILE_SITE_URL);
  // The counter is fetched by GitHub, never by this machine: a public address even when the
  // content is read from a portfolio in development.
  const viewsOrigin =
    PROFILE_VIEWS_SITE_URL === undefined
      ? siteOrigin
      : originOf('PROFILE_VIEWS_SITE_URL', PROFILE_VIEWS_SITE_URL);
  return makeSyncProfile({
    source: new HttpContentSource(siteOrigin, LOCALE),
    store: new DiskProfileStore(PROFILE_FOLDER ?? process.cwd()),
    viewsImageUrl: `${viewsOrigin}${VIEWS_IMAGE_PATH}`,
  });
}

try {
  const { written, removed } = await compose()();
  for (const path of written) console.log(`written  ${path}`);
  for (const path of removed) console.log(`removed  ${path}`);
  if (written.length + removed.length === 0) console.log('The profile is up to date.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'The profile could not be written.');
  process.exitCode = 1;
}
