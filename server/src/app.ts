// app.ts
import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

import client from './redisClient';
import tokenBucket from './algorithms/tokenBucket';
import leakyBucket from './algorithms/leakyBucket';
import db from './db';

const router = express.Router();

import fixedWindowCounter from './algorithms/fixedWindowCounter';
import slidingWindowLog from './algorithms/slidingWindowLog';
import slidingWindowCounter from './algorithms/slidingWindowCounter';
import exponentialBackoff from './algorithms/exponentialBackoff';
import { withNameSpace } from './utils/logger';
import { authenticateAdmin } from './middleware/authMiddleware';

const app = express();

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

const logger = withNameSpace('transaction');

const processTransaction = async (merchant_id, amount) => {
  try {
    logger.info(`Processing transaction for merchant ${merchant_id}`);
    await db('transactions').insert({ merchant_id, amount });

    logger.info(`Transaction recorded for merchant ${merchant_id}`);
    return true; // Transaction successful
  } catch (error) {
    console.error('Error recording transaction:', error);
    logger.error(
      `Error recording transaction for merchant ${merchant_id}, ${error}`
    );
    return false; // Transaction failed
  }
};

// Admin endpoints for fetching and updating rate limits
app.get('/admin/config', authenticateAdmin, async (req, res) => {
  const { merchant_id, algorithm } = req.body;
  const key = `merchant_${merchant_id}_${algorithm}`;
  try {
    const config = await client.get(key);

    if (config) {
      res.status(200).json(JSON.parse(config));
    } else {
      res.status(404).send('Config not found');
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).send('Server error');
  }
});

app.post('/admin/config', authenticateAdmin, async (req, res) => {
  const { merchant_id, tokens, algorithm } = req.body;
  const key = `merchant_${merchant_id}_${algorithm}`;
  try {
    // await client.set(key, JSON.stringify({ tokens }));
    await client.set(
      key,
      JSON.stringify({ tokens: tokens, lastRefillTimestamp: Date.now() })
    );
    res.status(200).send('Config updated');
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).send('Server error');
  }
});

// normal transaction processing

app.post('/transaction', async (req, res) => {
  const { merchant_id } = req.body;
  const success = await processTransaction(merchant_id, 100);
  if (success) {
    res.status(200).send('Transaction processed');
  } else {
    res.status(500).send('Error processing transaction');
  }
});

// Token Bucket Algorithm
app.post('/transaction/tokenBucket', tokenBucket, async (req, res) => {
  const { merchant_id, amount } = req.body;

  logger.info(
    `Processing transaction for merchant ${merchant_id} using token bucket.`
  );
  const success = await processTransaction(merchant_id, amount);
  if (success) {
    res.status(200).send('Transaction processed (Token Bucket)');
  } else {
    res.status(500).send('Error processing transaction');
  }
});

// Leaky Bucket Algorithm
app.post('/transaction/leakyBucket', leakyBucket, async (req, res) => {
  const { merchant_id, amount } = req.body;
  const success = await processTransaction(merchant_id, amount);
  if (success) {
    res.status(200).send('Transaction processed (Leaky Bucket)');
  } else {
    res.status(500).send('Error processing transaction');
  }
});

// Fixed Window Counter Algorithm
app.post(
  '/transaction/fixedWindowCounter',
  fixedWindowCounter,
  async (req, res) => {
    const { merchant_id, amount } = req.body;
    const success = await processTransaction(merchant_id, amount);
    if (success) {
      res.status(200).send('Transaction processed (Fixed Window Counter)');
    } else {
      res.status(500).send('Error processing transaction');
    }
  }
);

// Sliding Window Log Algorithm
app.post(
  '/transaction/slidingWindowLog',
  slidingWindowLog,
  async (req, res) => {
    const { merchant_id, amount } = req.body;
    const success = await processTransaction(merchant_id, amount);
    if (success) {
      res.status(200).send('Transaction processed (Sliding Window Log)');
    } else {
      res.status(500).send('Error processing transaction');
    }
  }
);

// Sliding Window Counter Algorithm
app.post(
  '/transaction/slidingWindowCounter',
  slidingWindowCounter,
  async (req, res) => {
    const { merchant_id, amount } = req.body;
    const success = await processTransaction(merchant_id, amount);
    if (success) {
      res.status(200).send('Transaction processed (Sliding Window Counter)');
    } else {
      res.status(500).send('Error processing transaction');
    }
  }
);

// Exponential Backoff Algorithm
app.post(
  '/transaction/exponentialBackoff',
  exponentialBackoff,
  async (req, res) => {
    const { merchant_id, amount } = req.body;
    const success = await processTransaction(merchant_id, amount);
    if (success) {
      res.status(200).send('Transaction processed (Exponential Backoff)');
    } else {
      res.status(500).send('Error processing transaction');
    }
  }
);

export default app;
