import client from '../redisClient';

/**
 * Fetches the rate limit configuration for a specific merchant from Redis.
 *
 * @param merchantId {number} - The unique merchant ID.
 * @returns {Promise<{ rateLimit: number }>} - The rate limit configuration.
 */
const getRateLimitConfig = async (
  merchantId: number
): Promise<{ rateLimit: number }> => {
  const maxTokens = 10;
  const configKey = `merchant_${merchantId}_config`;
  try {
    const config = await client.get(configKey);
    if (config) {
      return JSON.parse(config);
    }
    return { rateLimit: maxTokens };
  } catch (err) {
    console.error('Error fetching rate limit config:', err);
    throw err; // Re-throw for handling in middleware
  }
};

export default getRateLimitConfig;
