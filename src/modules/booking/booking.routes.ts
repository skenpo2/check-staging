import express from 'express';
import {
  createBookingController,
  getAllBookingController,
  getBookingByIDController,
  updateBookingByCustomerController,
  updateBookingByExpertController,
} from './booking.controllers';
import { roleGuard } from '../../middlewares/roleGuard';
import { Permissions } from '../../enums/user-role.enum';
import passport from '../../configs/passport.config';

const router = express.Router();

router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.VIEW_BOOKINGS),
  getAllBookingController
);
router.get(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.VIEW_BOOKINGS),
  getBookingByIDController
);
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.BOOK_SERVICE),
  createBookingController
);
router.put(
  '/id/expert',
  passport.authenticate('jwt', { session: false }),
  roleGuard([Permissions.ACCEPT_BOOKING, Permissions.REJECT_BOOKING]),
  updateBookingByExpertController
);
router.put(
  '/id/customer',
  passport.authenticate('jwt', { session: false }),
  roleGuard([Permissions.BOOK_SERVICE]),
  updateBookingByCustomerController
);

export default router;
