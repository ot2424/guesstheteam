import { describe, expect, it } from 'vitest';
import { parseAuthLink } from './authLinks';

describe('auth action links', () => {
  it('accepts confirmation and reset links with valid tokens', () => {
    for (const action of ['verify-email', 'reset-password']) {
      expect(parseAuthLink(`#action=${action}&token=${'a'.repeat(64)}`)).toEqual({ action, token: 'a'.repeat(64) });
    }
  });
  it('rejects missing, malformed or unknown actions', () => {
    expect(parseAuthLink('')).toBeNull();
    expect(parseAuthLink('#action=reset-password&token=bad')).toBeNull();
    expect(parseAuthLink(`#action=admin&token=${'a'.repeat(64)}`)).toBeNull();
  });
});
