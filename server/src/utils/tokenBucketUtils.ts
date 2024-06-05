import client from '../redisClient';

const maxTokens = 10; // Maximum number of tokens in the bucket
const refillRate = 1; // Number of tokens added to the bucket per second
const interval = 1000; // Refilling interval in milliseconds (1 second)

/**
 * Fetches the current token bucket state from Redis.
 *
 * @param key {string} - The unique Redis key for the merchant's token bucket.
 * @returns {Promise<{ tokens: number, lastRefillTimestamp: number }>} - The current token bucket state.
 */
export const getTokenBucketState = async (key) => {
  try {
    const bucketState = await client.get(key);
    if (!bucketState) {
      return { tokens: maxTokens, lastRefillTimestamp: Date.now() };
    }
    return JSON.parse(bucketState);
  } catch (err) {
    console.error('Error fetching token bucket state:', err);
    throw err; // Re-throw for handling in middleware
  }
};

/**
 * Updates the token bucket state in Redis.
 *
 * @param key {string} - The unique Redis key for the merchant's token bucket.
 * @param tokens {number} - The updated number of tokens in the bucket.
 * @param lastRefillTimestamp {number} - The timestamp of the last token refill.
 * @returns {Promise<void>}
 */
export const updateTokenBucketState = async (
  key,
  tokens,
  lastRefillTimestamp
) => {
  await client.set(key, JSON.stringify({ tokens, lastRefillTimestamp }));
};

/**
 * Resets the token bucket state in Redis for a specific merchant.
 *
 * @param merchantId {number} - The unique merchant ID.
 * @returns {Promise<void>}
 */
export const resetTokenBucket = async (merchantId: number): Promise<void> => {
  const key = `merchant_${merchantId}_token-bucket`;
  const initialState = JSON.stringify({
    tokens: maxTokens,
    lastRefillTimestamp: Date.now()
  });

  try {
    await await client.set(
      key,
      JSON.stringify({ tokens: maxTokens, lastRefillTimestamp: Date.now() }),
      {
        EX: Math.ceil(maxTokens / refillRate)
      }
    );
    console.log(`Token bucket for merchant ${merchantId} reset successfully.`);
  } catch (err) {
    console.error(
      `Error resetting token bucket for merchant ${merchantId}:`,
      err
    );
    throw err; // Re-throw for handling in tests or higher-level logic
  }
};
