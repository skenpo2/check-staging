import { Server, Socket } from 'socket.io';
import Message, { IMessage } from './model/messages.model';
import logger from '../../utils/logger';
import mongoose from 'mongoose';

// Store active user connections
const activeUsers = new Map<string, string>();

/**
 * Initialize Socket.IO message service
 * @param io Socket.IO server instance
 */
export const initializeMessageService = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // User authentication and room joining
    socket.on('authenticate', (userId: string) => {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return socket.emit('error', { message: 'Invalid user ID' });
      }

      // Store user's socket ID
      activeUsers.set(userId, socket.id);
      
      // Join a room with the user's ID to receive direct messages
      socket.join(userId);
      
      logger.info(`User ${userId} authenticated on socket ${socket.id}`);
      socket.emit('authenticated', { success: true });
    });

    // Handle sending a message
    socket.on('sendMessage', async (messageData: Partial<IMessage>) => {
      if (!messageData.sender || !messageData.receiver || !messageData.content) {
        return socket.emit('error', { 
          message: 'Missing required fields: sender, receiver, or content'
        });
      }

      try {
        // Create and save the message
        const message = new Message({
          sender: messageData.sender,
          receiver: messageData.receiver,
          content: messageData.content,
          booking: messageData.booking || null,
          read: false,
        });

        const savedMessage = await message.save();
        
        // Emit the message to the sender for confirmation
        socket.emit('messageSent', savedMessage);
        
        // Check if receiver is online and emit the message to them
        const receiverId = messageData.receiver.toString();
        if (activeUsers.has(receiverId)) {
          io.to(receiverId).emit('newMessage', savedMessage);
        }
        
        logger.info(`Message sent from ${messageData.sender} to ${messageData.receiver}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('markAsRead', async (data: { messageIds: string[], userId: string }) => {
      if (!data.messageIds || !data.userId) {
        return socket.emit('error', { message: 'Invalid request data' });
      }

      try {
        await Message.updateMany(
          { 
            _id: { $in: data.messageIds },
            receiver: data.userId,
            read: false
          },
          { $set: { read: true } }
        );

        socket.emit('messagesMarkedRead', { messageIds: data.messageIds });
        
        logger.info(`Messages marked as read by user ${data.userId}`);
      } catch (error) {
        logger.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Get conversation history
    socket.on('getConversation', async (data: { userId: string, otherUserId: string, limit?: number, skip?: number }) => {
      if (!data.userId || !data.otherUserId) {
        return socket.emit('error', { message: 'Invalid user IDs' });
      }

      try {
        const messages = await Message.find({
          $or: [
            { sender: data.userId, receiver: data.otherUserId },
            { sender: data.otherUserId, receiver: data.userId }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(data.limit || 50)
        .skip(data.skip || 0);

        socket.emit('conversationHistory', messages);
      } catch (error) {
        logger.error('Error retrieving conversation:', error);
        socket.emit('error', { message: 'Failed to retrieve conversation history' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Remove user from active users
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          logger.info(`User ${userId} disconnected`);
          break;
        }
      }
      
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

/**
 * Check if a user is online
 * @param userId User ID to check
 * @returns boolean indicating if user is online
 */
export const isUserOnline = (userId: string): boolean => {
  return activeUsers.has(userId);
};

/**
 * Send a system notification to a specific user
 * @param io Socket.IO server instance
 * @param userId User ID to send notification to
 * @param notification Notification message
 */
export const sendSystemNotification = (io: Server, userId: string, notification: any): void => {
  if (activeUsers.has(userId)) {
    io.to(userId).emit('systemNotification', notification);
  }
};
