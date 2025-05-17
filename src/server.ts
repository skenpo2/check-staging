import dotenv from 'dotenv';
dotenv.config();
import app from './app';

import connectDb from './configs/dB.config';
import { config } from './configs/app.config';
import logger from './utils/logger';

// Database connection
connectDb();

// start up the server
app.listen(config.PORT, () => {
  logger.info(`Server is listening on ${config.PORT} in ${config.NODE_ENV}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, 'reason:', reason);
});
