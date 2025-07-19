import { Request, Response } from 'express';
import Chat from './model/chat.model';
import AsyncHandler from '../../middlewares/asyncHandler';
import UserModel from '../user/model/user.model';
import Message from './model/message.model';

// @description     Create or fetch One to One Chat
// @route           POST /api/chat/
// @access          Protected
export const accessChat = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.body.userId;

    console.log('user', req.user?._id);

    console.log(userId);

    if (!userId) {
      console.log('UserId param not sent with request');
      res.sendStatus(400);
      return;
    }

    let isChat;

    isChat = await Chat.find({
      $and: [
        { users: { $elemMatch: { $eq: req.user?._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    isChat = await UserModel.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'name _id',
    });

    if (isChat.length > 0) {
      res.send(isChat[0]);
    } else {
      const chatData = {
        chatName: 'sender',
        users: [req.user?._id, userId],
      };

      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'users',
        'name _id'
      );

      res.status(200).json(fullChat);
    }
  }
);

// @description     Fetch all chats for a user
// @route           GET /api/chat/
// @access          Protected
export const fetchChats = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user?._id } },
    })
      .populate('users', 'name _id')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    const populatedChats = await UserModel.populate(chats, {
      path: 'latestMessage.sender',
      select: 'name _id',
    });

    res.status(200).send(populatedChats);
  }
);

// @description     Get all Messages
// @route           GET /api/message/:chatId
// @access          Protected
export const allMessages = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const chatId = req.params?.chatId;

    console.log(chatId);
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name _id')
      .populate('chat');

    res.json(messages);
  }
);

// @description     Create New Message
// @route           POST /api/message/
// @access          Protected
export const sendMessage = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      console.log('Invalid data passed into request');
      res.sendStatus(400);
      return;
    }

    const newMessage = {
      sender: req.user?._id,
      content,
      chat: chatId,
    };

    let message;
    message = await Message.create(newMessage);

    // Populate related fields
    message = await (
      await message.populate('sender', 'name _id')
    ).populate('chat');

    message = await UserModel.populate(message, {
      path: 'chat.users',
      select: 'name email _id',
    });

    // Update latestMessage in the chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json(message);
  }
);
