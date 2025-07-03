import express from 'express';
import {
  createBookingController,
  getAllBookingController,
  getBookingByIDController,
  updateBookingByIdController,
} from './booking.controllers';
import { roleGuard } from '../../middlewares/roleGuard';
import { Permissions } from '../../enums/user-role.enum';

const router = express.Router();

router.get('/', roleGuard(Permissions.VIEW_BOOKINGS), getAllBookingController);
router.get(
  '/:id',
  roleGuard(Permissions.VIEW_BOOKINGS),
  getBookingByIDController
);
router.post('/', roleGuard(Permissions.BOOK_SERVICE), createBookingController);
router.put(
  '/id',
  roleGuard([Permissions.ACCEPT_BOOKING, Permissions.REJECT_BOOKING]),
  updateBookingByIdController
);

export default router;
