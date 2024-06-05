import { Request, Response, NextFunction } from 'express';
import {
  getTokenBucketState,
  updateTokenBucketState
} from '../utils/tokenBucketUtils';

const maxTokens = 10; // Maximum number of tokens in the bucket
const refillRate = 1; // Number of tokens added to the bucket per second
const interval = 1000; // Refilling interval in milliseconds (1 second)

/**
 * Token Bucket rate limiting middleware
 *
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express NextFunction callback
 */
const tokenBucket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { merchant_id } = req.body; // Extract the merchant_id from the request body
  const key = `merchant_${merchant_id}_token-bucket`;

  try {
    // Get the current token bucket state
    let { tokens, lastRefillTimestamp } = await getTokenBucketState(key);

    // Calculate time elapsed and refill tokens
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastRefillTimestamp;
    const refillTokens = Math.floor(elapsedTime / interval) * refillRate;

    // Update token count and last refill timestamp
    tokens = Math.min(tokens + refillTokens, tokens || maxTokens);
    lastRefillTimestamp = currentTime;

    if (tokens > 0) {
      // Allow the request if there are available tokens
      tokens -= 1;
      await updateTokenBucketState(key, tokens, lastRefillTimestamp);
      next();
    } else {
      // Reject the request if there are no available tokens
      res.status(429).send('Too many requests, please try again later');
    }
  } catch (err) {
    console.error('Error in token bucket middleware:', err);
    res.status(500).send('Server error');
  }
};

export default tokenBucket;
