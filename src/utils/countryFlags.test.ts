import { describe, expect, it } from 'vitest';
import { getCountryCode, getFlagUrl } from './countryFlags';

describe('countryFlags', () => {
  it('maps common API nationality variants to flag codes', () => {
    expect(getCountryCode('Deutschland')).toBe('de');
    expect(getCountryCode("Côte d'Ivoire")).toBe('ci');
    expect(getCountryCode('Cote dIvoire')).toBe('ci');
    expect(getCountryCode('South Korea')).toBe('kr');
    expect(getCountryCode('US')).toBe('us');
  });

  it('returns undefined for unknown nationality values', () => {
    expect(getCountryCode('Unknown')).toBeUndefined();
    expect(getFlagUrl('Unknown')).toBeUndefined();
  });
});
