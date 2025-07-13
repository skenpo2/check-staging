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
          payment: { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          month: { $month: '$createdAt' },
          netPrice: { $subtract: ['$price', '$platformFee'] },
        },
      },
      {
        $project: {
          month: 1,
          price: 1,
          netPrice: 1,
          isCompleted: { $eq: ['$status', 'COMPLETED'] },
          // Any booking with payment AND not completed is pending
          isPending: { $ne: ['$status', 'COMPLETED'] },
        },
      },
      {
        $facet: {
          completed: [
            { $match: { isCompleted: true } },
            {
              $group: {
                _id: '$month',
                total: { $sum: '$netPrice' },
              },
            },
          ],
          pending: [
            { $match: { isPending: true } },
            {
              $group: {
                _id: '$month',
                total: { $sum: '$price' }, // or netPrice if you prefer
              },
            },
          ],
        },
      },
      {
        $project: {
          merged: {
            $setUnion: ['$completed', '$pending'],
          },
          completed: 1,
          pending: 1,
        },
      },
      { $unwind: '$merged' },
      {
        $project: {
          month: '$merged._id',
          complete: {
            $reduce: {
              input: '$completed',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', '$merged._id'] },
                  '$$this.total',
                  '$$value',
                ],
              },
            },
          },
          pending: {
            $reduce: {
              input: '$pending',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', '$merged._id'] },
                  '$$this.total',
                  '$$value',
                ],
              },
            },
          },
        },
      },
      { $sort: { month: 1 } },
    ]);

    // Fill in months 1–12
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
