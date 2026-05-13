/**
 * Smoke test for the real (non-random) match logic. We mock the DB
 * layer so the test is hermetic.
 */

const mockQuery = jest.fn();

jest.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  __esModule: true,
  default: {},
}));

jest.mock('../index', () => ({
  redis: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] }),
  },
}));

import { checkForMatch, candidateHasRightSwipe } from '../models/swipe';

describe('match logic', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('checkForMatch returns true when both sides have a right swipe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const result = await checkForMatch('cand-1', 'job-1');
    expect(result).toBe(true);
  });

  it('checkForMatch returns false when nothing matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await checkForMatch('cand-1', 'job-1');
    expect(result).toBe(false);
  });

  it('candidateHasRightSwipe queries swipes table', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const result = await candidateHasRightSwipe('cand-1', 'job-1');
    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs[0]).toMatch(/FROM swipes/i);
  });
});
