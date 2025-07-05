import dotenv from 'dotenv';
dotenv.config();
import app, {server} from './app';

import connectDb from './configs/dB.config';
import { config } from './configs/app.config';
import logger from './utils/logger';

const PORT = config.PORT;
// Database connection
connectDb();

// server
app.listen(PORT, () => {
  logger.info(`Server is listening on ${PORT} in ${config.NODE_ENV}`);
});

/* 
  Will be used for Socket.IO but we still need to discuss if we need the app 
  listening for most cases as server.listen is already doing that.
*/
server.listen(PORT, () => {
  logger.info(`Server is listening on ${PORT} in ${config.NODE_ENV}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, 'reason:', reason);
});
