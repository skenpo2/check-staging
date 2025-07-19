import express from 'express';

import passport from 'passport';
import {
  accessChat,
  allMessages,
  fetchChats,
  sendMessage,
} from './controllers';

const router = express.Router();

const authenticate = passport.authenticate('jwt', { session: false });

// router.post('/', authenticate, sendMessage);
// router.get('/conversation/:userId/:otherUserId', authenticate, getConversation);
// router.get('/conversations/:userId', authenticate, getUserConversations);
// router.patch('/read', authenticate, markMessagesAsRead);
// router.delete('/:messageId', authenticate, deleteMessage);
router.post('/chat', authenticate, accessChat);
router.get('/chats', authenticate, fetchChats);
router.get('/conversation/:chatId', authenticate, allMessages);
router.post('/conversation', authenticate, sendMessage);

export default router;
