import { Request, Response, NextFunction } from 'express';

const windowSize = 5; // 5 seconds
let log: number[] = [];

const slidingWindowLog = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const now = Date.now();

  // Remove log entries older than windowSize
  log = log.filter((timestamp) => now - timestamp <= windowSize * 1000);

  // Add current request timestamp to log
  log.push(now);

  if (log.length <= 5) {
    next();
  } else {
    res.status(429).send('Too many requests');
  }
};

export default slidingWindowLog;
