import { Request, Response, NextFunction } from 'express';

let lastTime: number = Date.now();
let tokens: number = 0;
const capacity: number = 10;
const leakRate: number = 1; // tokens per second

const leakyBucket = (req: Request, res: Response, next: NextFunction): void => {
  const now: number = Date.now();
  const elapsedTime: number = (now - lastTime) / 1000;
  tokens -= elapsedTime * leakRate;
  tokens = Math.max(tokens, 0);
  lastTime = now;

  if (tokens < capacity) {
    tokens += 1;
    next();
  } else {
    res.status(429).send('Too many requests');
  }
};

// Function to reset tokens (for testing purposes)
export const resetLeakyBucket = () => {
  lastTime = Date.now();
  tokens = 0;
};

export default leakyBucket;
