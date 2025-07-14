import express from 'express';
import { getDashboardWithAggregation } from './user.dashboard-aggregate.controller';
import { roleGuard } from '../../middlewares/roleGuard';
import { Permissions } from '../../enums/user-role.enum';
import passport from '../../configs/passport.config';
import {
  getLastFiveListingByExpertId,
  getLastFourBookingByExpertId,
  getLastFourReviewsByExpertId,
} from './user.dashboard.controller';
import { getMonthlyPaymentSummary } from './user.payment-graph.controllers';

const router = express.Router();

router.get(
  '/expert',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.CREATE_LISTING),
  getDashboardWithAggregation
);

router.get(
  '/listing',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.CREATE_LISTING),
  getLastFiveListingByExpertId
);

router.get(
  '/booking',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.CREATE_LISTING),
  getLastFourBookingByExpertId
);

router.get(
  '/payment',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.CREATE_LISTING),
  getMonthlyPaymentSummary
);

router.get(
  '/review',
  passport.authenticate('jwt', { session: false }),
  getLastFourReviewsByExpertId
);

export default router;
