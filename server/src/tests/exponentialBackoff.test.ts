import * as request from 'supertest';
import app from '../app';
import { createClient, RedisClientType } from 'redis';

describe('Exponential Backoff Middleware', () => {
  let client: RedisClientType;

  beforeAll(() => {
    client = createClient({
      url: 'redis://localhost:6379'
    });

    client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    client.connect().catch(console.error);
  });

  afterAll(() => {
    client.quit();
  });

  beforeEach(async () => {
    // Reset the backoff attempts for each merchant
    for (let i = 1; i <= 5; i++) {
      const key = `merchant_${i}_backoff`;
      await client.del(key);
    }
  });

  beforeEach(async () => {
    await resetBackoff(1); // Reset backoff for merchant 1 before each test
  });

  const resetBackoff = async (merchantId: number): Promise<void> => {
    await request(app)
      .post('/transaction/exponentialBackoff')
      .query({ reset: 'true' })
      .send({ merchant_id: merchantId });
  };

  test('Normal Case', async () => {
    const response = await request(app)
      .post('/transaction/exponentialBackoff')
      .send({ merchant_id: 1, amount: 200 });
    expect(response.status).toBe(200);
  });

  test('Exponential Backoff Limit Reached', async () => {
    // Send more than the backoff limit
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/transaction/exponentialBackoff')
        .send({ merchant_id: 2, amount: 100 });
      expect(response.status).toBe(200);
    }

    const response = await request(app)
      .post('/transaction/exponentialBackoff')
      .send({ merchant_id: 2, amount: 100 });
    expect(response.status).toBe(429);
  });

  test('Token Reset', async () => {
    // Reset the backoff attempts for each merchant
    for (let i = 1; i <= 5; i++) {
      const key = `merchant_${i}_backoff`;
      await client.del(key);
    }

    const response = await request(app)
      .post('/transaction/exponentialBackoff')
      .send({ merchant_id: 3, amount: 200 });
    expect(response.status).toBe(200);
  });

  test('Concurrent Requests', async () => {
    const requests = Array(5)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/exponentialBackoff')
          .send({ merchant_id: 4, amount: 200 });
      });

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  test('Edge Case - No Requests', async () => {
    const response = await request(app)
      .post('/transaction/exponentialBackoff')
      .send({ merchant_id: 5, amount: 200 });
    expect(response.status).toBe(200);
  });
});
