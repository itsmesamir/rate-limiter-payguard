import * as request from 'supertest';
import app from '../app';
import { resetLeakyBucket } from '../algorithms/leakyBucket';

describe('Leaky Bucket Algorithm', () => {
  // Reset the module to clear any state
  beforeEach(() => {
    resetLeakyBucket();
  });

  test('Normal Case', async () => {
    const response = await request(app)
      .post('/transaction/leakyBucket')
      .send({ merchant_id: 1, amount: 100 });
    expect(response.status).toBe(200);
  });

  test('Exceed Rate Limit', async () => {
    const requests = Array(15)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/leakyBucket')
          .send({ merchant_id: 1, amount: 100 });
      });

    const responses = await Promise.all(requests);

    const successCount = responses.filter(
      (response) => response.status === 200
    ).length;
    const rateLimitedCount = responses.filter(
      (response) => response.status === 429
    ).length;

    expect(successCount).toBeGreaterThanOrEqual(10); // First 10 requests should succeed, but can be 11 due to timing
    expect(successCount).toBeLessThanOrEqual(11); // Allow for minor timing variance
    expect(rateLimitedCount).toBe(15 - successCount);
  });

  test('Token Leak', async () => {
    const initialResponse = await request(app)
      .post('/transaction/leakyBucket')
      .send({ merchant_id: 1, amount: 100 });
    expect(initialResponse.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds

    const subsequentResponse = await request(app)
      .post('/transaction/leakyBucket')
      .send({ merchant_id: 1, amount: 100 });
    expect(subsequentResponse.status).toBe(200); // Should succeed as tokens have leaked
  });

  test('Token Refill', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/transaction/leakyBucket')
        .send({ merchant_id: 1, amount: 100 });
      expect(response.status).toBe(200);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second

    const response = await request(app)
      .post('/transaction/leakyBucket')
      .send({ merchant_id: 1, amount: 100 });
    expect(response.status).toBe(200); // Should succeed as tokens have refilled
  });

  test('Concurrent Requests', async () => {
    const requests = Array(5)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/leakyBucket')
          .send({ merchant_id: 1, amount: 100 });
      });

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  test('Edge Case - Initial State', async () => {
    const response = await request(app)
      .post('/transaction/leakyBucket')
      .send({ merchant_id: 1, amount: 100 });
    expect(response.status).toBe(200); // First request should always succeed
  });

  test('Edge Case - Maximum Capacity', async () => {
    const requests = Array(20)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/leakyBucket')
          .send({ merchant_id: 1, amount: 100 });
      });

    const responses = await Promise.all(requests);
    responses.slice(0, 11).forEach((response) => {
      expect(response.status).toBe(200); // First 10 requests should succeed
    });
    responses.slice(11).forEach((response) => {
      expect(response.status).toBe(429); // Remaining requests should be rejected
    });
  });
});
