import { Request, Response, NextFunction } from 'express';

import mongoose from 'mongoose';
import Booking from '../booking/model/booking.model';
import Listing from '../listing/model/listing.model';
import Review from '../review/model/review.model';
import AsyncHandler from '../../middlewares/asyncHandler';
import { HTTPSTATUS } from '../../configs/http.config';

export const getUserDashboardAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = new mongoose.Types.ObjectId((req as any).user._id);

    // This week range
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch bookings for earnings calculation
    const [
      confirmedPaidBookings,
      avgRatingAgg,
      upcomingBooking,
      latestListings,
      pending,
      completed,
      declined,
    ] = await Promise.all([
      Booking.find({
        user: userId,
        status: 'confirmed',
        paymentStatus: 'paid',
      }),
      Review.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
      Booking.findOne({ user: userId, date: { $gte: new Date() } }).sort({
        date: 1,
      }),
      Listing.find({ user: userId }).sort({ createdAt: -1 }).limit(4),
      Booking.find({ user: userId, status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(2),
      Booking.find({ user: userId, status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(2),
      Booking.find({ user: userId, status: 'declined' })
        .sort({ createdAt: -1 })
        .limit(2),
    ]);

    const totalEarnings = confirmedPaidBookings.reduce((sum, booking) => {
      const price = booking.price || 0;
      const fee = booking.platformFee || 0;
      return sum + (price - fee);
    }, 0);

    const totalBookingsThisWeek = await Booking.countDocuments({
      user: userId,
      createdAt: { $gte: startOfWeek, $lte: endOfWeek },
    });

    const averageRating = avgRatingAgg[0]?.avgRating || 0;

    res.status(200).json({
      totalBookingsThisWeek,
      totalEarnings,
      averageRating,
      latestUpcomingBooking: upcomingBooking,
      latestListings,
      pendingBookings: pending,
      completedBookings: completed,
      declinedBookings: declined,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
