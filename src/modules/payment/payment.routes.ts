import express from 'express';
import {
  getPaymentController,
  getUserPaymentsController,
  initializePaymentController,
  paystackWebhookController,
  verifyPaymentController,
} from './payment.controller';
import passport from 'passport';
import { roleGuard } from '../../middlewares/roleGuard';
import { Permissions } from '../../enums/user-role.enum';

const router = express.Router();

router.post(
  '/initialize',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.MAKE_PAYMENT),
  initializePaymentController
);

router.get(
  '/verify/:reference/status',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.MAKE_PAYMENT),
  verifyPaymentController
);

router.get(
  '/user',
  roleGuard(Permissions.MAKE_PAYMENT),
  passport.authenticate('jwt', { session: false }),
  getUserPaymentsController
);

router.get(
  '/:reference',
  roleGuard(Permissions.MAKE_PAYMENT),
  passport.authenticate('jwt', { session: false }),
  getPaymentController
);

// Public webhook route for Paystack
router.post('/webhook', paystackWebhookController);

export default router;
