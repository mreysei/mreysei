import { makeSyncProfile } from './application/sync-profile.ts';
import { DiskPreviewSource } from './infrastructure/disk-preview-source.ts';
import { DiskProfileStore } from './infrastructure/disk-profile-store.ts';
import { optionalOriginOf, originOf, otherSitesOf } from './environment.ts';
import { HttpContentSource } from './infrastructure/http-content-source.ts';
import { HttpPictureSource } from './infrastructure/http-picture-source.ts';

/** The README is written in English, the language of GitHub; the site has the other two. */
const LOCALE = 'en';
const VIEWS_IMAGE_PATH = '/api/github-profile/views.svg';

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
    source: new HttpContentSource(siteOrigin, LOCALE, otherSitesOf(process.env)),
    store: new DiskProfileStore(PROFILE_FOLDER ?? process.cwd()),
    pictures: new HttpPictureSource(
      siteOrigin,
      optionalOriginOf('PROFILE_CDN_URL', process.env.PROFILE_CDN_URL),
    ),
    // The screenshots belong to this repository, wherever the files are written.
    previews: new DiskPreviewSource(process.cwd()),
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
