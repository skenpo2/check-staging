import logger from './logger';

export const getEnv = (key: string, defaultValue: string = ''): string => {
  const value = process.env[key];

  if (value === undefined) {
    if (defaultValue) {
      return defaultValue;
    }
    logger.error(`Environment variable ${key} is not set`);
    throw new Error(`Environment variable ${key} is not set`);
  }

  return value;
};
