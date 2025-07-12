import express, { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import './configs/passport.config';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redis from './redis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import routes from './routes';
import errorHandler from './middlewares/errorHandler.middleware';
import logger from './utils/logger';
import client from './configs/postHog.config';
import { publishEvent } from './configs/rabbitmqPublisher';

const app = express();

//PROXY SETUP
app.set('trust proxy', 1);

//USE PASSPORT
app.use(passport.initialize());

// MIDDLEWARES

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'none'"], //  Block all content loading
        scriptSrc: ["'none'"], // Block any script loading
        styleSrc: ["'none'"], // No CSS needed on an API server
        imgSrc: ["'none'"], //  No image content allowed
        connectSrc: ["'self'"], //  Only allow outbound connections to self
        frameAncestors: ["'none'"], //  Disallow embedding
      },
    },
    crossOriginEmbedderPolicy: false, // Safe to disable — avoids blocking frontend fetches
  })
);

app.use(
  cors({
    origin: ['https://checkslate-project.netlify.app', 'http://localhost:5173'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

app.use(express.json());
app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  next();
});

app.post('/track', async (req: Request, res: Response) => {
  const { event, data } = req.body;

  await publishEvent(event, data);

  res.send('hello tracker').status(200);
});

//DDOS PROTECTION RATE LIMITING
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'middleware',
  points: 10,
  duration: 1,
});

app.use((req: Request, res: Response, next: NextFunction) => {
  rateLimiter
    .consume(req.ip as string)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: 'Too many requests' });
    });
});

// API ROUTES
app.use('/api', routes);

// GLOBAL ERROR HANDLER
app.use(errorHandler);

export default app;
