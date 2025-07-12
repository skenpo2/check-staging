import dotenv from 'dotenv';
import { EventName, EventProperties } from '../enums/analyticsEvents';
import logger from '../utils/logger';

dotenv.config();

let connection: any; // fallback to any to satisfy TypeScript safely
let channel: any;

const QUEUE_NAME = 'analytics_events';

export async function initRabbitMQ() {
  // dynamically import amqplib to avoid broken typings
  const amqplib = await import('amqplib');
  connection = await amqplib.connect(process.env.RABBITMQ_URL!);
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  logger.info('RabbitMQ connected.');
}

export async function publishEvent<T extends EventName>(
  event: T,
  data: EventProperties[T]
) {
  if (!channel) throw new Error('RabbitMQ channel not initialized!');

  const message = JSON.stringify({ event, data });
  channel.sendToQueue(QUEUE_NAME, Buffer.from(message), {
    persistent: true,
  });
}

export async function closeRabbitMQ() {
  try {
    if (channel) {
      logger.info('Closing RabbitMQ channel...');
      await channel.close();
    }
    if (connection) {
      logger.info('Closing RabbitMQ connection...');
      await connection.close();
    }
  } catch (error) {
    logger.error('Failed to close RabbitMQ:', error);
  }
}
