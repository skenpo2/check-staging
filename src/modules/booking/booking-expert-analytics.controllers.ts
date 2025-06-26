import { Request, Response, NextFunction } from 'express';
import AsyncHandler from '../../middlewares/asyncHandler';
import { HTTPSTATUS } from '../../configs/http.config';
import Booking from './model/booking.model';
import { BookingStatusEnum } from '../../enums/booking-status.enum';

export const getLatestBookingByExpertId = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    const booking = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $facet: {
          pending: [
            { $match: { status: BookingStatusEnum.PENDING } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
          ],
          completed: [
            { $match: { status: BookingStatusEnum.COMPLETED } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
          ],
          declined: [
            { $match: { status: BookingStatusEnum.CANCELLED } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    const result = booking[0];

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Booking Created',
      pendingBookings: result.pending,
      completedBookings: result.completed,
      declinedBookings: result.declined,
    });
  }
);
