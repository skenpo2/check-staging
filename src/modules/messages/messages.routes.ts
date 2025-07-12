import express from 'express';
import { 
  sendMessage, 
  getConversation, 
  getUserConversations, 
  markMessagesAsRead, 
  deleteMessage 
} from './messages.controller';
import passport from 'passport';

const router = express.Router();

const authenticate = passport.authenticate('jwt', { session: false });

router.post('/', authenticate, sendMessage);
router.get('/conversation/:userId/:otherUserId', authenticate, getConversation);
router.get('/conversations/:userId', authenticate, getUserConversations);
router.patch('/read', authenticate, markMessagesAsRead);
router.delete('/:messageId', authenticate, deleteMessage);

export default router;
