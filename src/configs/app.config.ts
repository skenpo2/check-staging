import { getEnv } from '../utils/get-env';

const appConfig = () => ({
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnv('PORT', '6000'),
  BASE_PATH: getEnv('BASE_PATH', '/api'),
  FRONTEND_ORIGIN: getEnv('FRONTEND_ORIGIN', ''),
  ACCESS_TOKEN: getEnv('ACCESS_TOKEN', ''),
  MONGO_URI: getEnv('MONGO_URI', ''),
  REDIS_URI: getEnv('REDIS_URI', ''),
  SMTP_HOST: getEnv('SMTP_HOST', ''),
  SMTP_PORT: getEnv('SMTP_PORT', ''),
  SMTP_SERVICE: getEnv('SMTP_SERVICE', ''),
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASSWORD: getEnv('SMTP_PASSWORD', ''),
  GOOGLE_CALLBACK_URL: getEnv('GOOGLE_CALLBACK_URL', ''),
  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET', ''),

  CLOUDINARY_SECRET: getEnv('CLOUDINARY_SECRET', ''),
  CLOUDINARY_KEY: getEnv('CLOUDINARY_KEY', ''),
  CLOUDINARY_NAME: getEnv('CLOUDINARY_NAME', ''),
});

export const config = appConfig();
