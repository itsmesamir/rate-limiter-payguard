import { Request, Response, NextFunction } from 'express';

let windowStart: number = Date.now();
let count: number = 0;
const windowSize: number = 60000; // 1 minute
const limit: number = 10;

const fixedWindowCounter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const now: number = Date.now();
  if (now - windowStart >= windowSize) {
    windowStart = now;
    count = 0;
  }

  if (count < limit) {
    count += 1;
    next();
  } else {
    res.status(429).send('Too many requests');
  }
};

export default fixedWindowCounter;
