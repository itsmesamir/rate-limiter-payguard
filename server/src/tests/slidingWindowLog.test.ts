import * as request from 'supertest';
import app from '../app';

describe('Sliding Window Log Middleware', () => {
  let count: number = 0;
  const limit: number = 10;
  const windowSize: number = 60000; // 1 minute
  let windowStart: number = Date.now();

  const makeRequests = async (numRequests: number): Promise<number[]> => {
    const promises = Array(numRequests)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/slidingWindowLog')
          .send({ merchant_id: 1, amount: 100 });
      });

    const responses = await Promise.all(promises);
    return responses.map((res) => res.status);
  };

  beforeEach(() => {
    windowStart = Date.now();
    count = 0;
  });

  test('Under limit requests', async () => {
    const numRequests = 5;
    const responses = await makeRequests(numRequests);
    expect(responses.every((status) => status === 200)).toBe(true);
  });

  test('Exceed limit requests', async () => {
    const numRequests = 15;
    const responses = await makeRequests(numRequests);
    expect(responses.slice(0, 5).every((status) => status === 200)).toBe(true);
    expect(responses.slice(10).every((status) => status === 429)).toBe(true);
  });

  test('Reset after window', async () => {
    const numRequests = 15;
    const responses = await makeRequests(numRequests);

    const count200 = responses.filter((status) => status === 200).length;
    const count429 = responses.filter((status) => status === 429).length;

    expect(count200).toBe(4);
    expect(count429).toBe(5);

    // Wait for the window to reset
    await new Promise((resolve) => setTimeout(resolve, windowSize + 100));

    const newResponses = await makeRequests(5);
    expect(newResponses.every((status) => status === 200)).toBe(true);
  });
});
