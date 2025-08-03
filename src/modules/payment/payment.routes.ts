import express from 'express';
import {
  getAvailableYears,
  getCustomerPaymentAnalytics,
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
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.MAKE_PAYMENT),
  getUserPaymentsController
);

//payments analytics for Customer
router.get(
  '/analytics',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.MAKE_PAYMENT),
  getCustomerPaymentAnalytics
);

// Route to get available years for dropdown
// GET /api/payments/years?userId=60d5ecb74e8c4a001f5e8f21
router.get(
  '/years',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.MAKE_PAYMENT),
  getAvailableYears
);

router.get(
  '/:reference',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.MAKE_PAYMENT),
  getPaymentController
);

export default router;
