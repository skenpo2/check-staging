import { Request, Response } from 'express';

import Booking from '../booking/model/booking.model';
import Review from '../review/model/review.model';

export const getDashboardWithAggregation = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?._id;

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    // Booking Aggregation Pipeline
    const bookingStats = await Booking.aggregate([
      { $match: { expert: userId } },
      {
        $facet: {
          totalBookingsThisWeek: [
            {
              $match: {
                createdAt: { $gte: startOfWeek, $lte: endOfWeek },
              },
            },
            { $count: 'count' },
          ],
          totalEarnings: [
            {
              $match: {
                status: 'COMPLETED',
              },
            },
            {
              $project: {
                earning: { $subtract: ['$price', '$platformFee'] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$earning' },
              },
            },
          ],
          upcoming: [
            {
              $match: {
                status: 'PAID',
                scheduledAt: { $gte: new Date() },
              },
            },
            { $sort: { date: 1 } },
            { $limit: 1 },
          ],
        },
      },
    ]);

    const ratingAgg = await Review.aggregate([
      { $match: { expert: userId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);

    const result = bookingStats[0];

    res.json({
      totalBookingsThisWeek: result.totalBookingsThisWeek[0]?.count || 0,
      totalEarnings: result.totalEarnings[0]?.total || 0,
      averageRating: ratingAgg[0]?.avgRating || 0,
      latestUpcomingBooking: result.upcoming[0].scheduledAt || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Dashboard analytics error' });
  }
};
