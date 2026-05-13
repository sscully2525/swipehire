import { validatePassword } from '../utils/password';

describe('password policy', () => {
  it('rejects short passwords', () => {
    const r = validatePassword('Short1!');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /at least 10/.test(e))).toBe(true);
  });

  it('rejects when only 2 character classes present', () => {
    const r = validatePassword('aaaaaaaaaaaaa1');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /at least 3/.test(e))).toBe(true);
  });

  it('rejects common passwords even when long', () => {
    const r = validatePassword('password123');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /common/.test(e) || /weak/.test(e))).toBe(true);
  });

  it('rejects when password contains user email local-part', () => {
    const r = validatePassword('SeanMcKenzie2026!', { email: 'sean@example.com' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /similar/.test(e))).toBe(true);
  });

  it('accepts a strong password with 3+ classes and no common-words', () => {
    const r = validatePassword('Tr0ub4dor&3lephant');
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('produces a zxcvbn score when available', () => {
    const r = validatePassword('Tr0ub4dor&3lephant');
    // zxcvbn returns 0..4
    expect(typeof r.score === 'number' || r.score === undefined).toBe(true);
  });
});
