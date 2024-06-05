import * as request from 'supertest';
import app from '../app';
import { createClient } from 'redis';
import client from '../redisClient';

describe('Sliding Window Counter Middleware', () => {
  afterAll(() => {
    client.quit();
  });

  beforeEach(async () => {
    // Reset the token bucket for each merchant
    for (let i = 1; i <= 5; i++) {
      const key = `merchant_${i}_sw_counter`;
      await client.del(key);
    }
  });

  test('Normal Case', async () => {
    const response = await request(app)
      .post('/transaction/slidingWindowCounter')
      .send({ merchant_id: 1, amount: 100 });
    expect(response.status).toBe(200);
  });

  test('Exceed Rate Limit', async () => {
    // Send more than the limit within the window
    const requests = Array(11)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/slidingWindowCounter')
          .send({ merchant_id: 2, amount: 100 });
      });

    const responses = await Promise.all(requests);
    responses.slice(0, 11).forEach((response) => {
      expect(response.status).toBe(200); // First 10 requests should succeed
    });
    responses.slice(11).forEach((response) => {
      expect(response.status).toBe(429); // Remaining requests should be rejected
    });
  });

  test('Token Reset', async () => {
    // Reset the token bucket for each merchant
    for (let i = 1; i <= 5; i++) {
      const key = `merchant_${i}_sw_counter`;
      await client.del(key);
    }

    const requests = Array(5)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/slidingWindowCounter')
          .send({ merchant_id: 3 });
      });

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  test('Concurrent Requests', async () => {
    const requests = Array(5)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/slidingWindowCounter')
          .send({ merchant_id: 4 });
      });

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  test('Edge Case - No Requests', async () => {
    const response = await request(app)
      .post('/transaction/slidingWindowCounter')
      .send({ merchant_id: 5 });
    expect(response.status).toBe(200);
  });

  test('Edge Case - Maximum Capacity', async () => {
    const requests = Array(10)
      .fill(undefined)
      .map((_, index) => {
        return new Promise((resolve) => {
          setTimeout(async () => {
            const response = await request(app)
              .post('/transaction/slidingWindowCounter')
              .send({ merchant_id: 6 });
            resolve(response);
          }, index * 100); // Delay each request by 100 milliseconds
        });
      });

    const responses = await Promise.all(requests);
    responses.forEach((response: any) => {
      expect(response.status).toBe(200);
    });

    const extraResponse = await request(app)
      .post('/transaction/slidingWindowCounter')
      .send({ merchant_id: 6 });
    expect(extraResponse.status).toBe(429);
  });
});
