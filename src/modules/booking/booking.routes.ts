import express from 'express';
import {
  createBookingController,
  getAllBookingController,
  getBookingByIDController,
  updateBookingByIdController,
} from './booking.controllers';

const router = express.Router();

router.get('/', getAllBookingController);
router.get('/:id', getBookingByIDController);
router.post('/', createBookingController);
router.put('/id', updateBookingByIdController);

export default router;
