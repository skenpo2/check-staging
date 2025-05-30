import dotenv from 'dotenv';
dotenv.config();
import app from './app';

import connectDb from './configs/dB.config';
import { config } from './configs/app.config';
import logger from './utils/logger';
import { NextFunction, Request, Response } from 'express';

const PORT = config.PORT;
// Database connection
connectDb();

// server
app.listen(PORT, () => {
  logger.info(`Server is listening on ${PORT} in ${config.NODE_ENV}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, 'reason:', reason);
});
