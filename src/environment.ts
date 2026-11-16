import type { OtherSites } from './infrastructure/http-content-source.ts';

/**
 * The sites the program is told about, read from the environment by its two commands: no host
 * is written in the program.
 */

/** The origin of a site named in the environment: http or https, nothing else. */
export function originOf(variable: string, value: string | undefined): string {
  const url = value !== undefined && URL.canParse(value) ? new URL(value) : null;
  if (url === null || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    throw new Error(`${variable} must be the address of a site, such as https://www.example.org.`);
  }
  return url.origin;
}

/** An optional site: none when the variable is empty. */
export function optionalOriginOf(variable: string, value: string | undefined): string | null {
  return value === undefined || value.trim() === '' ? null : originOf(variable, value);
}

/** The terminal and the play site, for a portfolio that does not name them yet. */
export function otherSitesOf(environment: NodeJS.ProcessEnv): OtherSites {
  return {
    terminalOrigin: optionalOriginOf('PROFILE_TERMINAL_URL', environment.PROFILE_TERMINAL_URL),
    playOrigin: optionalOriginOf('PROFILE_PLAY_URL', environment.PROFILE_PLAY_URL),
  };
}
