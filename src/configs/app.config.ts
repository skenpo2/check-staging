import { getEnv } from '../utils/get-env';

const appConfig = () => ({
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnv('PORT', '3001'),
  BASE_PATH: getEnv('BASE_PATH', '/api'),
  MONGO_URI: getEnv('MONGO_URI', ''),
  // ACCESS_TOKEN: getEnv('ACCESS_TOKEN'),
});

export const config = appConfig();
