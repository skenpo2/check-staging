import express, { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import './configs/passport.config';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import redis from './redis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import http from 'http';
import { Server } from 'socket.io';
import { HTTPSTATUS } from './configs/http.config';
import routes from './routes';
import errorHandler from './middlewares/errorHandler.middleware';
import logger from './utils/logger';
import { publishEvent } from './configs/rabbitmqPublisher';
import { initializeMessageService } from './modules/messages/messages.service';
import { paystackWebhookController } from './modules/payment/payment.controller';

// Create Express app
const app = express();

// PROXY SETUP
app.set('trust proxy', 1);

// USE PASSPORT
app.use(passport.initialize());

// MIDDLEWARES
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
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

// Public webhook route for Paystack
app.post(
  '/api/paystack/webhook',
  express.raw({ type: '*/*' }),
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    next();
  },
  paystackWebhookController
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
  res.status(200).send('Event queued');
});

// DDOS PROTECTION RATE LIMITING
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
      res
        .status(HTTPSTATUS.TOO_MANY_REQUESTS)
        .json({ success: false, message: 'Too many requests' });
    });
});

// API ROUTES
app.use('/api', routes);

// GLOBAL ERROR HANDLER
app.use(errorHandler);

// Create HTTP server with Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['https://checkslate-project.netlify.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize your real-time messaging
initializeMessageService(io);

export { app, server, io };
