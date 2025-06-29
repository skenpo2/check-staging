import express from 'express';
import passport from 'passport';
import {
  createKycInfo,
  getKycByEmail,
  updateKycInfo,
  updateKycStatus,
} from './user-kyc.controller';

const router = express.Router();

router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  getKycByEmail
);

router.post(
  '/initialize',
  passport.authenticate('jwt', { session: false }),
  createKycInfo
);
router.post(
  '/update/:id',
  passport.authenticate('jwt', { session: false }),
  updateKycInfo
);

//admin only
router.post(
  '/status/:id',
  passport.authenticate('jwt', { session: false }),
  updateKycStatus
);

export default router;
