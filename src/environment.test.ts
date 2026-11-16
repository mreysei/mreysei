import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { originOf, otherSitesOf } from './environment.ts';

describe('the sites of the environment', () => {
  it('keeps the origin of an http or https address', () => {
    assert.equal(
      originOf('X', 'https://terminal.example.org/en?x=1'),
      'https://terminal.example.org',
    );
    assert.equal(originOf('X', 'http://localhost:4003'), 'http://localhost:4003');
  });

  it('refuses what is not the address of a site', () => {
    for (const value of [
      undefined,
      'terminal.example.org',
      'terminal.example.org:443',
      'ftp://x.org',
    ]) {
      assert.throws(() => originOf('PROFILE_TERMINAL_URL', value), /PROFILE_TERMINAL_URL must be/);
    }
  });

  it('names no other site where the variables are missing or empty', () => {
    assert.deepEqual(otherSitesOf({ PROFILE_TERMINAL_URL: ' ' }), {
      terminalOrigin: null,
      playOrigin: null,
    });
  });
});
