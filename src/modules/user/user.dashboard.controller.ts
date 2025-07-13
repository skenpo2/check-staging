import { Request, Response, NextFunction } from 'express';

import Booking from '../booking/model/booking.model';
import Listing from '../listing/model/listing.model';
import AsyncHandler from '../../middlewares/asyncHandler';
import { HTTPSTATUS } from '../../configs/http.config';

export const getLastFourBookingByExpertId = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?._id.toString();

    const [pending, paid, done, cancelled] = await Promise.all([
      Booking.find({ expert: userId, status: 'PENDING' })
        .select('scheduledAt status')
        .sort({ createdAt: -1 })
        .limit(4)
        .populate([
          {
            path: 'customer',
            select: 'name _id',
          },
          {
            path: 'listing',
            select: 'title _id',
          },
        ]),

      Booking.find({ expert: userId, status: 'PAID' })
        .select('scheduledAt status')
        .sort({ createdAt: -1 })
        .limit(4)
        .populate([
          {
            path: 'customer',
            select: 'name _id',
          },
          {
            path: 'listing',
            select: 'title _id',
          },
        ]),

      Booking.find({ expert: userId, status: 'DONE' })
        .select('scheduledAt status')
        .sort({ createdAt: -1 })
        .limit(4)
        .populate([
          {
            path: 'customer',
            select: 'name _id',
          },
          {
            path: 'listing',
            select: 'title _id',
          },
        ]),

      Booking.find({ expert: userId, status: 'CANCELLED' })
        .select('scheduledAt status')
        .sort({ createdAt: -1 })
        .limit(4)
        .populate([
          {
            path: 'customer',
            select: 'name _id',
          },
          {
            path: 'listing',
            select: 'title _id',
          },
        ]),
    ]);

    res.status(HTTPSTATUS.OK).json({
      pendingBookings: pending,
      paidBookings: paid,
      completedBookings: done,
      declinedBookings: cancelled,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res
      .status(HTTPSTATUS.INTERNAL_SERVER_ERROR)
      .json({ message: 'Internal server error' });
  }
};

//get expert last five listings  for analytic dashboard
export const getLastFiveListingByExpertId = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const listings = await Listing.find({ expert: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(HTTPSTATUS.OK).json({
      latestListings: listings,
    });
  }
);
