import { getEnv } from '../utils/get-env';

const appConfig = () => ({
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnv('PORT', '6000'),
  BASE_PATH: getEnv('BASE_PATH', '/api'),
  ACCESS_TOKEN: getEnv('ACCESS_TOKEN', ''),
  MONGO_URI: getEnv('MONGO_URI', ''),
  REDIS_URI: getEnv('REDIS_URI', ''),
  SMTP_HOST: getEnv('SMTP_HOST', ''),
  SMTP_PORT: getEnv('SMTP_PORT', ''),
  SMTP_SERVICE: getEnv('SMTP_SERVICE', ''),
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASSWORD: getEnv('SMTP_PASSWORD', ''),
});

export const config = appConfig();
