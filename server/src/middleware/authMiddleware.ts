import { Request, Response, NextFunction } from 'express';

const adminToken = process.env.token;

if (!adminToken) {
  throw new Error('Missing admin token');
}

export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization Header' });
  }

  const token = authHeader.split(' ')[1];
  if (token === adminToken) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Invalid Token' });
  }
};
