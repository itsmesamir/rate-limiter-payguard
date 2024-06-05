import { Request, Response, NextFunction } from 'express';
import client from '../redisClient';

const exponentialBackoff = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { merchant_id } = req.body;
  const key: string = `merchant_${merchant_id}_backoff`;
  const baseDelay: number = 1000; // 1 second

  try {
    if (req.query.reset === 'true') {
      await client.del(key); // Reset the backoff attempts for the merchant
      res.status(200).send('Backoff reset successful');
      return;
    }

    const attempts = await client.get(key);
    const parsedAttempts: number = attempts ? parseInt(attempts) : 0;

    if (parsedAttempts < 5) {
      await client.set(key, (parsedAttempts + 1).toString(), {
        EX: Math.pow(2, parsedAttempts - 1) * baseDelay
      });
      next();
    } else {
      res.status(429).send('Too many requests, please try again later');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default exponentialBackoff;
