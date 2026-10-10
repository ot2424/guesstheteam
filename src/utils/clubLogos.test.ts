import { describe, expect, it } from 'vitest';
import { getClubLogoSources } from './clubLogos';

describe('club logo sources', () => {
  it('replaces stale tutorial Wikimedia links with the correct club source', () => {
    expect(getClubLogoSources('https://upload.wikimedia.org/stale.svg', 'rennes')[0]).toBe('https://tmssl.akamaized.net/images/wappen/big/273.png');
  });
  it('preserves supplied logos and supports numeric club IDs without duplicates', () => {
    expect(getClubLogoSources('https://example.com/logo.png', '123')).toHaveLength(2);
    expect(getClubLogoSources('https://tmssl.akamaized.net/images/wappen/big/123.png', '123')).toHaveLength(1);
    expect(getClubLogoSources('', 'career-ended')).toEqual([]);
  });
});
