const mockQuery = jest.fn();
const mockRedis = {
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn(),
};

jest.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

jest.mock('../index', () => ({
  redis: mockRedis,
}));

import { createSwipe } from '../models/swipe';

describe('swipe job-feed cache invalidation', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRedis.del.mockClear();
    mockRedis.scan.mockReset();
    mockQuery.mockResolvedValue({
      rows: [{ id: 'swipe-1', user_id: 'user-1', job_id: 'job-1', direction: 'right' }],
    });
    mockRedis.scan.mockResolvedValue({ cursor: 0, keys: [] });
  });

  it('clears both legacy and versioned candidate job-feed cache keys after a swipe', async () => {
    await createSwipe('user-1', 'job-1', 'right', 0.91);

    const scanPatterns = mockRedis.scan.mock.calls.map((call) => call[1].MATCH);
    expect(scanPatterns).toEqual(expect.arrayContaining([
      'jobs:user-1:*',
      'jobs:v*:user-1:*',
    ]));
  });
});
