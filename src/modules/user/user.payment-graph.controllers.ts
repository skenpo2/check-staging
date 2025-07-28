import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../booking/model/booking.model';
import AsyncHandler from '../../middlewares/asyncHandler';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const getExpertYearlyEarnings = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const expertId = new mongoose.Types.ObjectId(req.user?._id);
    const year = parseInt(req.query.year as string);

    if (isNaN(year)) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }

    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

    const result = await Booking.aggregate([
      {
        $match: {
          expert: expertId,
          payment: { $ne: null },
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $project: {
          month: { $month: '$createdAt' },
          netPrice: { $subtract: ['$price', '$platformFee'] },
          status: 1,
        },
      },
      {
        $group: {
          _id: '$month',
          Pending: {
            $sum: {
              $cond: [{ $in: ['$status', ['PAID', 'DONE']] }, '$netPrice', 0],
            },
          },
          Completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$netPrice', 0],
            },
          },
        },
      },
    ]);

    // Create a map with default 0 values
    const earningsMap: Record<number, { Completed: number; Pending: number }> =
      {};
    for (let i = 1; i <= 12; i++) {
      earningsMap[i] = { Completed: 0, Pending: 0 };
    }

    // Merge aggregation result into the map
    for (const entry of result) {
      const monthNum = entry._id;
      earningsMap[monthNum] = {
        Completed: entry.Completed || 0,
        Pending: entry.Pending || 0,
      };
    }

    // Convert to final format
    const earningsArray = Object.keys(earningsMap).map((monthStr) => {
      const monthNum = parseInt(monthStr);
      return {
        month: MONTHS[monthNum - 1],
        completed: earningsMap[monthNum].Completed,
        pending: earningsMap[monthNum].Pending,
      };
    });

    return res.status(200).json(earningsArray);
  }
);
