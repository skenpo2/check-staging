import { Server } from 'socket.io';
import logger from '../../utils/logger';

/**
 * Test function to verify Socket.IO is working
 * @param io Socket.IO server instance
 */
export const testSocketConnection = (io: Server): void => {
  // Set up a test event listener
  io.on('connection', (socket) => {
    logger.info(`Socket connected for testing: ${socket.id}`);

    // Test ping-pong
    socket.on('ping', (data) => {
      logger.info(`Received ping from ${socket.id} with data:`, data);
      socket.emit('pong', { message: 'Pong from server!', timestamp: new Date().toISOString() });
    });

    // Test echo
    socket.on('echo', (data) => {
      logger.info(`Received echo request from ${socket.id} with data:`, data);
      socket.emit('echo-response', { 
        originalMessage: data,
        echoed: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  logger.info('Socket.IO test listeners initialized');
};
