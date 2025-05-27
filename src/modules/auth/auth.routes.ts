import express from 'express';
import {
  registerUserController,
  verifyUserRegistration,
} from './auth.controllers';

const router = express.Router();

router.post('/register', registerUserController);
router.post('/verify-registration', verifyUserRegistration);

export default router;
