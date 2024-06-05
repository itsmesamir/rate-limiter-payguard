import * as request from 'supertest';
import app from '../app';

describe('Fixed Window Counter Middleware', () => {
  let count: number = 0;
  const limit: number = 10;
  const windowSize: number = 60000; // 1 minute
  let windowStart: number = Date.now();

  const makeRequests = async (numRequests: number): Promise<number[]> => {
    const promises = Array(numRequests)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/fixedWindowCounter')
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

  test('Exceed Rate Limit', async () => {
    for (let i = 0; i < limit; i++) {
      await request(app)
        .post('/transaction/fixedWindowCounter')
        .send({ merchant_id: 1, amount: 100 });
    }
    const response = await request(app)
      .post('/transaction/fixedWindowCounter')
      .send({ merchant_id: 1, amount: 100 });
    expect(response.status).toBe(429);
  });
});
