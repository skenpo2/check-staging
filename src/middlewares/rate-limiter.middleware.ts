import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import logger from '../utils/logger';
import redis from '../redis';

//Ip based rate limiting for sensitive endpoints
export const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: 'Too many requests' });
  },
  store: new RedisStore({
    sendCommand: (command: string, ...args: (string | number | Buffer)[]) => {
      return redis.call(command, ...args) as unknown as Promise<any>;
    },
  }),
});
