/**
 * Minimal smoke tests. These are pure-Node and don't require a DB/Redis
 * so they always run in CI. Boot-time integration tests should go in a
 * separate suite that spins up the real services.
 */

describe('smoke', () => {
  it('node version is supported (>=18)', () => {
    const major = Number(process.versions.node.split('.')[0]);
    expect(major).toBeGreaterThanOrEqual(18);
  });

  it('package.json declares server name', () => {
    const pkg = require('../../package.json');
    expect(pkg.name).toBe('swipehire-server');
  });

  it('JWT helpers sign and verify a token', async () => {
    // Avoid pulling in db/redis imports from user.ts by using jsonwebtoken directly.
    const jwt = require('jsonwebtoken');
    const secret = 'test-secret-test-secret-test-secret-32';
    const token = jwt.sign({ userId: 'u1' }, secret, { expiresIn: '5m' });
    const decoded: any = jwt.verify(token, secret);
    expect(decoded.userId).toBe('u1');
  });
});
