const mockQuery = jest.fn();
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),
};

jest.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

jest.mock('../index', () => ({
  redis: mockRedis,
}));

import { getJobById, getJobsForSwiping } from '../models/startup';

describe('startup demo-data filtering', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setEx.mockResolvedValue('OK');
  });

  it('excludes demo companies from candidate swipe feed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getJobsForSwiping('user-1', {});

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('COALESCE(s.is_demo, false) = false');
  });

  it('excludes demo-company jobs from direct job lookup', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getJobById('job-1');

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('COALESCE(s.is_demo, false) = false');
  });
});
