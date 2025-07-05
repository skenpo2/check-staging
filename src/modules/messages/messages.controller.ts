import { Request, Response, NextFunction } from 'express';
import Message from './model/messages.model';
import mongoose from 'mongoose';
import { isUserOnline } from './messages.service';
import AsyncHandler from '../../middlewares/asyncHandler';
import { HTTPSTATUS } from '../../configs/http.config';


export const sendMessage = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { sender, receiver, content, booking } = req.body;

  if (!sender || !receiver || !content) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      success: false,
      message: 'Missing required fields: sender, receiver, or content',
    });
  }

  const message = new Message({
    sender,
    receiver,
    content,
    booking: booking || null,
    read: false,
  });

  const savedMessage = await message.save();

  // Include online status of the receiver
  const isReceiverOnline = isUserOnline(receiver.toString());

  res.status(HTTPSTATUS.CREATED).json({
    success: true,
    data: savedMessage,
    meta: {
      isReceiverOnline,
    },
  });
});

export const getConversation = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId, otherUserId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  // Validate user IDs
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid user IDs',
    });
  }

  // Get conversation messages
  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip(Number(skip));

  // Count unread messages
  const unreadCount = await Message.countDocuments({
    sender: otherUserId,
    receiver: userId,
    read: false,
  });

  // Include online status of the other user
  const isOtherUserOnline = isUserOnline(otherUserId);

  res.status(HTTPSTATUS.OK).json({
    success: true,
    data: messages,
    meta: {
      unreadCount,
      isOtherUserOnline,
    },
  });
});


export const getUserConversations = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;

  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid user ID',
    });
  }

  // Aggregate to get the latest message from each conversation
  const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { receiver: new mongoose.Types.ObjectId(userId) }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', new mongoose.Types.ObjectId(userId)] },
              '$receiver',
              '$sender',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          unreadCount: 1,
          user: {
            _id: 1,
            name: 1,
            email: 1,
            profilePicture: 1,
          },
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
    ]);

  // Add online status for each user
  const conversationsWithOnlineStatus = conversations.map((convo) => ({
    ...convo,
    isOnline: isUserOnline(convo._id.toString()),
  }));

  res.status(HTTPSTATUS.OK).json({
    success: true,
    data: conversationsWithOnlineStatus,
  });
});


export const markMessagesAsRead = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { messageIds, userId } = req.body;

  // Validate required fields
  if (!messageIds || !messageIds.length || !userId) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      success: false,
      message: 'Missing required fields: messageIds or userId',
    });
  }

  // Update messages
  const result = await Message.updateMany(
    {
      _id: { $in: messageIds },
      receiver: userId,
      read: false,
    },
    { $set: { read: true } }
  );

  res.status(HTTPSTATUS.OK).json({
    success: true,
    data: {
      modifiedCount: result.modifiedCount,
    },
  });
});

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  // Validate message ID
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid message ID',
    });
  }

  // Find the message
  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(HTTPSTATUS.NOT_FOUND).json({
      success: false,
      message: 'Message not found',
    });
  }

  // Check if user is authorized to delete the message
  if (message.sender.toString() !== userId) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      success: false,
      message: 'Not authorized to delete this message',
    });
  }

  // Delete the message
  await Message.findByIdAndDelete(messageId);

  res.status(HTTPSTATUS.OK).json({
    success: true,
    message: 'Message deleted successfully',
  });
});
