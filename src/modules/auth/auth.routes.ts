import express from 'express';
import {
  forgotPasswordController,
  loginUserController,
  logoutController,
  refreshTokenController,
  registerUserController,
  setPasswordController,
  verifyUserRegistrationController,
} from './auth.controllers';
import passport from 'passport';
import { HTTPSTATUS } from '../../configs/http.config';

const router = express.Router();
router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.status(HTTPSTATUS.OK).json({
      success: true,
      data: req.user,
    });
  }
);
router.post('/register', registerUserController);
router.post('/verify-registration', verifyUserRegistrationController);
router.post('/login', loginUserController);
router.post('/forgot-password', forgotPasswordController);
router.post(
  '/reset-password',
  passport.authenticate('jwt', { session: false }),
  setPasswordController
);
router.get('/refresh', refreshTokenController);
router.post('/logout', logoutController);
export default router;
