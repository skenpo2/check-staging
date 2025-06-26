import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Booking from '../booking/model/booking.model';

export const getMonthlyPaymentSummary = async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId((req as any).user._id);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const summary = await Booking.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startOfYear, $lt: endOfYear },
        },
      },
      {
        $addFields: {
          month: { $month: '$createdAt' },
          isComplete: {
            $and: [
              { $eq: ['$paymentStatus', 'paid'] },
              { $eq: ['$status', 'confirmed'] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { month: '$month', complete: '$isComplete' },
          total: { $sum: '$price' },
        },
      },
      {
        $group: {
          _id: '$_id.month',
          complete: {
            $sum: {
              $cond: [{ $eq: ['$_id.complete', true] }, '$total', 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$_id.complete', false] }, '$total', 0],
            },
          },
        },
      },
      {
        $project: {
          month: '$_id',
          complete: 1,
          pending: 1,
          _id: 0,
        },
      },
      {
        $sort: { month: 1 },
      },
    ]);

    // Fill in missing months (1–12)
    const final = Array.from({ length: 12 }, (_, i) => {
      const monthData = summary.find((s) => s.month === i + 1);
      return {
        month: new Date(0, i).toLocaleString('default', { month: 'short' }),
        complete: monthData?.complete || 0,
        pending: monthData?.pending || 0,
      };
    });

    res.json({ year, data: final });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: 'Failed to get payment summary' });
  }
};
