import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashPassword, hashToken, verifyPassword } from './AuthService';

describe('passwords and session tokens', () => {
  it('uses a fresh salt, validates the password and rejects incorrect or malformed hashes', async () => {
    const first = await hashPassword('a-long-test-password');
    const second = await hashPassword('a-long-test-password');
    expect(first).not.toBe(second);
    expect(await verifyPassword('a-long-test-password', first)).toBe(true);
    expect(await verifyPassword('incorrect-password', first)).toBe(false);
    expect(await verifyPassword('a-long-test-password', 'scrypt$bad$not-a-hash')).toBe(false);
  });
  it('accepts imported bcrypt hashes and rejects the wrong password', async () => {
    const hash = await bcrypt.hash('existing-user-password', 10);
    expect(await verifyPassword('existing-user-password', hash)).toBe(true);
    expect(await verifyPassword('incorrect', hash)).toBe(false);
  });
  it('stores only deterministic session token hashes', () => {
    expect(hashToken('session-token')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken('session-token')).not.toBe(hashToken('other-token'));
  });
});
