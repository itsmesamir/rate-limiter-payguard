// import request from 'supertest';
import * as request from 'supertest';
import app from '../app';
import client from '../redisClient';
import { resetTokenBucket } from '../utils/tokenBucketUtils';

// const request = require('supertest');
// const app = require('../your/app'); // Path to your Express app file

describe('Token Bucket Algorithm', () => {
  const merchantId = 1;

  beforeEach(async () => {
    await resetTokenBucket(merchantId);
  });

  afterAll(async () => {
    await client.quit(); // Close the Redis connection after all tests
  });

  const REFILL_TIME = 1000;
  test('Normal Case', async () => {
    const response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    expect(response.status).toBe(200);
  });

  test('Per-Merchant Rate Limiting', async () => {
    const merchantId1 = 1;
    const merchantId2 = 2;

    await resetTokenBucket(merchantId1);
    await resetTokenBucket(merchantId2);

    const response1 = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId1, amount: 100 });
    const response2 = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId2, amount: 100 });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });

  test('Handling Bursts of Traffic', async () => {
    const merchantId = 1;
    await resetTokenBucket(merchantId);

    // Send a burst of 10 requests (within the max tokens limit)
    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/transaction/tokenBucket')
        .send({ merchant_id: merchantId, amount: 100 });
      expect(response.status).toBe(200);
    }

    // Send additional requests to exceed the rate limit
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/transaction/tokenBucket')
        .send({ merchant_id: merchantId, amount: 100 });
      expect(response.status).toBe(429);
    }

    // Wait for refill interval to ensure tokens are added back
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Send another request after waiting for tokens to refill
    const responseAfterWait = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    expect(responseAfterWait.status).toBe(200);
  });

  test('Exceed Rate Limit', async () => {
    // Send multiple requests within a short time frame
    for (let i = 0; i < 15; i++) {
      await request(app)
        .post('/transaction/tokenBucket')
        .send({ merchant_id: merchantId, amount: 100 });

      // Wait for a short time to simulate the rate limit
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });

    expect(response.status).toBe(429);
  });

  test('Admin Configuration of Rate Limits', async () => {
    const adminToken = process.env.token;

    const fetchResponse = await request(app)
      .get('/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ merchant_id: 1, algorithm: 'token-bucket' });

    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body.tokens).toBeDefined();

    const updateResponse = await request(app)
      .post('/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ merchant_id: 1, tokens: 200, algorithm: 'token-bucket' });

    expect(updateResponse.status).toBe(200);
  });

  test('Dynamic Adjustments to Rate Limits', async () => {
    const merchantId = 1;
    await resetTokenBucket(merchantId);
    const adminToken = process.env.token;

    const updateResponse = await request(app)
      .post('/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        merchant_id: merchantId,
        tokens: 15,
        algorithm: 'token-bucket'
      });
    expect(updateResponse.status).toBe(200);

    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/transaction/tokenBucket')
        .send({ merchant_id: merchantId, amount: 100 });
    }

    const response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    expect(response.status).toBe(200);
  });

  test('Idempotent Operations', async () => {
    const merchantId = 1;
    await resetTokenBucket(merchantId);

    const response1 = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    const response2 = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });

  test('Token Refill', async () => {
    // Send requests spaced apart so that the token bucket refills between requests
    // All requests should succeed
    let response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    expect(response.status).toBe(200);

    // Wait for token refill time
    await new Promise((resolve) => setTimeout(resolve, REFILL_TIME));

    response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    expect(response.status).toBe(200);
  });

  test('Concurrent Requests', async () => {
    // Send multiple requests concurrently
    // Verify that all requests are processed correctly without exceeding the rate limit
    const requests = Array(10)
      .fill(undefined)
      .map(() => {
        return request(app)
          .post('/transaction/tokenBucket')
          .send({ merchant_id: merchantId, amount: 100 });
      });

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  test('Multiple Merchants', async () => {
    // Send requests for multiple merchants
    // Verify that rate limiting is applied independently for each merchant
    let response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    expect(response.status).toBe(200);

    response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: 2, amount: 100 });
    expect(response.status).toBe(200);
  });

  test('Edge Case - Refill Rate', async () => {
    // Send requests at a rate that matches the refill rate
    // Verify that all requests are processed without exceeding the rate limit
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/transaction/tokenBucket')
        .send({ merchant_id: merchantId, amount: 100 });
      // Wait for token refill time
      await new Promise((resolve) => setTimeout(resolve, REFILL_TIME / 10));
    }

    // Wait for token refill time to ensure tokens are refilled
    await new Promise((resolve) => setTimeout(resolve, REFILL_TIME));

    const response = await request(app)
      .post('/transaction/tokenBucket')
      .send({ merchant_id: merchantId, amount: 100 });
    expect(response.status).toBe(200);
  });
});
