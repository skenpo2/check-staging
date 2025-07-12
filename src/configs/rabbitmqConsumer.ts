import amqplib from 'amqplib';
import dotenv from 'dotenv';
import { EventName, EventProperties } from '../enums/analyticsEvents';
import logger from '../utils/logger';
dotenv.config();

const QUEUE_NAME = 'analytics_events';

export async function startEventConsumer(
  processEvent: <T extends EventName>(
    event: T,
    data: EventProperties[T]
  ) => Promise<void>
) {
  const connection = await amqplib.connect(process.env.RABBITMQ_URL!);
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  logger.info(' RabbitMQ consumer started.');

  channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (msg) {
        try {
          const parsed = JSON.parse(msg.content.toString());
          const event = parsed.event as EventName;
          const data = parsed.data;

          console.log(` Received event: ${event}`);

          await processEvent(event, data);

          channel.ack(msg);
        } catch (err) {
          logger.info('Error processing event:', err);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
}
