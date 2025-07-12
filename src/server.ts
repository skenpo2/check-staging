import dotenv from 'dotenv';
dotenv.config();
import { server } from './app';
import connectDb from './configs/dB.config';
import { config } from './configs/app.config';
import logger from './utils/logger';
import { startEventConsumer } from './configs/rabbitmqConsumer';
import { initRabbitMQ, closeRabbitMQ } from './configs/rabbitmqPublisher';
import client from './configs/postHog.config';
import { v4 as uuidv4 } from 'uuid';

const distinctId = uuidv4();

const PORT = config.PORT;

(async () => {
  try {
    await connectDb();
    await initRabbitMQ();

    await startEventConsumer(async (event, data) => {
      logger.info(`Analytics Event: ${event}`);
      client.capture({
        distinctId,
        event,
        properties: data,
      });
    });

    // Start HTTP + Socket.IO server
    server.listen(PORT, () => {
      logger.info(`Server is listening on ${PORT} in ${config.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Server failed to start:', error);
    process.exit(1);
  }
})();

async function shutdown() {
  logger.info(' Starting graceful shutdown...');

  try {
    logger.info('Closing HTTP server...');
    await new Promise<void>((resolve) => server.close(() => resolve()));
  } catch (err) {
    logger.error('Error closing HTTP server:', err);
  }

  try {
    logger.info('Closing RabbitMQ...');
    await closeRabbitMQ();
  } catch (err) {
    logger.error('Error closing RabbitMQ:', err);
  }

  try {
    logger.info('Closing MongoDB...');
    await (await import('mongoose')).connection.close();
  } catch (err) {
    logger.error('Error closing MongoDB:', err);
  }

  try {
    logger.info('Shutting down PostHog...');
    await client.shutdown();
  } catch (err) {
    logger.error('Error shutting down PostHog:', err);
  }

  logger.info('Graceful shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, 'reason:', reason);
});
