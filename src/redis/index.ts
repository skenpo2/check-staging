import Redis from 'ioredis';
import { config } from '../configs/app.config';

const redis = new Redis(config.REDIS_URI);

export default redis;
