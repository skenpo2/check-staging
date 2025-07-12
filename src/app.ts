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

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['https://checkslate-project.netlify.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize real-time messaging service
import { initializeMessageService } from './modules/messages/messages.service';
initializeMessageService(io);

//PROXY SETUP
app.set('trust proxy', 1);

//USE PASSPORT
app.use(passport.initialize());

// MIDDLEWARES
app.use(helmet());
app.use(
  cors({
    origin: ['https://checkslate-project.netlify.app', 'http://localhost:5173'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

app.use(express.json());
app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  next();
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
      res.status(HTTPSTATUS.TOO_MANY_REQUESTS).json({ success: false, message: 'Too many requests' });
    });
});

// API ROUTES
app.use('/api', routes);

// GLOBAL ERROR HANDLER
app.use(errorHandler);

// SOCKET.IO CONNECTION
export { io, server };

export default app; // Might no longer be needed if server.listen is used directly in server.ts
