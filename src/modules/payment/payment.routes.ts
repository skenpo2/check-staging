import express from 'express';
import {
  getPaymentController,
  getUserPaymentsController,
  initializePaymentController,
  paystackWebhookController,
  verifyPaymentController
} from './payment.controller';
import passport from 'passport';

const router = express.Router();

router.post(
  '/initialize',
  passport.authenticate('jwt', { session: false }),
  initializePaymentController
);

router.post(
  '/verify',
  passport.authenticate('jwt', { session: false }),
  verifyPaymentController
);

router.get(
  '/user',
  passport.authenticate('jwt', { session: false }),
  getUserPaymentsController
);

router.get(
  '/:reference',
  passport.authenticate('jwt', { session: false }),
  getPaymentController
);

// Public webhook route for Paystack
router.post('/webhook', paystackWebhookController);

export default router;
