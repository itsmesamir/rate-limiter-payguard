import { Request, Response, NextFunction } from 'express';
import client from '../redisClient';
import { withNameSpace } from '../utils/logger';

const logger = withNameSpace('slidingWindowCounter');

const slidingWindowCounter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { merchant_id } = req.body;
  const key: string = `merchant_${merchant_id}_sw_counter`;
  const windowSize: number = 60000; // 1 minute
  const limit: number = 10;

  try {
    // Remove old requests
    await client.zRemRangeByScore(key, 0, Date.now() - windowSize);

    // Get current request count
    const count = await client.zCard(key);
    if (count < limit) {
      // Add new request
      await client.zAdd(key, [
        { score: Date.now(), value: Date.now().toString() }
      ]);
      res.status(200).send('Transaction processed (Sliding Window Counter)');
    } else {
      res.status(429).send('Too many requests');
    }
  } catch (err) {
    console.error(err);
    logger.error(err);
    res.status(500).send('Server error');
  }
};

export default slidingWindowCounter;
