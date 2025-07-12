import dotenv from 'dotenv';
dotenv.config();
import app from './app';

import connectDb from './configs/dB.config';
import { config } from './configs/app.config';
import logger from './utils/logger';
import { startEventConsumer } from './configs/rabbitmqConsumer';
import { initRabbitMQ, closeRabbitMQ } from './configs/rabbitmqPublisher';
import client from './configs/postHog.config';

const PORT = config.PORT;

let server: import('http').Server;

(async () => {
  try {
    // Database connection
    await connectDb();

    // Initialize RabbitMQ producer
    await initRabbitMQ();

    // Start RabbitMQ consumer
    await startEventConsumer(async (event, data) => {
      logger.info(`Analytics Event: ${event}`);
      client.capture({
        distinctId: 'anonymous',
        event,
        properties: data,
      });
    });

    // Start HTTP server and capture reference
    server = app.listen(PORT, () => {
      logger.info(`Server is listening on ${PORT} in ${config.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Server failed to start:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
async function shutdown() {
  logger.info(' Starting graceful shutdown...');

  // Stop accepting HTTP connections
  if (server) {
    logger.info('Closing HTTP server...');
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Close RabbitMQ
  try {
    logger.info('Closing RabbitMQ...');
    await closeRabbitMQ();
  } catch (err) {
    logger.error('Error closing RabbitMQ:', err);
  }

  // Close MongoDB
  try {
    logger.info('Closing MongoDB...');
    await (await import('mongoose')).connection.close();
  } catch (err) {
    logger.error('Error closing MongoDB:', err);
  }

  // Shutdown PostHog
  try {
    logger.info('Shutting down PostHog...');
    await client.shutdown();
  } catch (err) {
    logger.error('Error shutting down PostHog:', err);
  }

  logger.info(' Graceful shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, 'reason:', reason);
});
