import { Request, Response, NextFunction } from 'express';
import { HTTPSTATUS } from '../../configs/http.config';
import asyncHandler from '../../middlewares/asyncHandler';
import { BadRequestException, NotFoundException } from '../../utils/appError';
import logger from '../../utils/logger';
import {
  createPaymentRecord,
  generateTransactionReference,
  getPaymentByReference,
  getUserPayments,
  handlePaystackWebhookEvent,
  initializePaystackPayment,
  updatePaymentStatus,
  verifyPaystackPayment,
  verifyPaystackWebhookSignature,
} from './payment.service';
import mongoose from 'mongoose';
import {
  InitializePaymentSchema,
  VerifyPaymentSchema,
} from '../../validations/payment.validations';
import Booking from '../booking/model/booking.model';
import { BookingStatusEnum } from '../../enums/booking-status.enum';
import Payment, { IPaymentDocument } from './model/payment.model';
import AsyncHandler from '../../middlewares/asyncHandler';

export const initializePaymentController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { bookingId } = InitializePaymentSchema.parse({ ...req.body });

      const isBooking = await Booking.findOne({
        _id: bookingId,
        status: BookingStatusEnum.CONFIRMED,
        customer: req.user?._id,
      }).session(session);

      if (!isBooking) {
        throw new NotFoundException(
          'Booking Not found or Booking has been settled'
        );
      }

      const reference = generateTransactionReference();
      isBooking.payRef = reference;

      const metadata = {
        bookingId,
        serviceId: isBooking.listing,
        expertId: isBooking.expert,
        customerId: isBooking.customer,
      };

      const paymentInitResult = await initializePaystackPayment(
        isBooking.price,
        req.user?.email,
        reference,
        metadata
      );

      await isBooking.save({ session });

      await createPaymentRecord(
        {
          booking: bookingId,
          customer: req.user?._id.toString(),
          service: isBooking.listing.toString(),
          expert: isBooking.expert.toString(),
          amount: isBooking.price,
          transactionReference: reference,
          status: 'pending',
        },
        session
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        data: {
          authorizationUrl: paymentInitResult.authorization_url,
          accessCode: paymentInitResult.access_code,
          reference: paymentInitResult.reference,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return next(error);
    }
  }
);

export const verifyPaymentController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const reference = req.params.reference;

      // Verify payment with Paystack
      const verificationResult = await verifyPaystackPayment(reference);

      if (verificationResult.status === 'success') {
        // Update payment status to success
        const payment = (await updatePaymentStatus(
          reference,
          'success',
          verificationResult.id.toString(),
          session
        )) as IPaymentDocument;

        // Update booking status to PAID if not already updated
        const booking = await Booking.findOne({
          payRef: reference,
          status: BookingStatusEnum.CONFIRMED, // only if not already marked PAID
          customer: req.user?._id,
        }).session(session);

        if (booking) {
          booking.status = BookingStatusEnum.PAID;
          booking.payment = payment._id as mongoose.Types.ObjectId;
          await booking.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        const { id, status, paid_at, amount } = verificationResult;

        return res.status(HTTPSTATUS.OK).json({
          success: true,
          data: {
            transactionId: id,
            amount,
            status,
            date: paid_at,
          },
        });
      } else {
        await updatePaymentStatus(reference, 'failed'); // Not in transaction
        await session.abortTransaction();
        session.endSession();

        return res.status(HTTPSTATUS.BAD_REQUEST).json({
          success: false,
          message: 'Payment verification failed',
          data: verificationResult,
        });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
);

export const paystackWebhookController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    // Verify webhook signature from Paystack
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      logger.error('No Paystack signature found in webhook request');
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }
    console.log('before sign', req.body);
    // Verify the signature using the service method
    const payload = req.body;
    const isValidSignature = verifyPaystackWebhookSignature(signature, payload);

    if (!isValidSignature) {
      logger.error('Invalid Paystack webhook signature');
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }
    console.log('before', req.body);
    const rawBody = req.body.toString();
    const event = JSON.parse(rawBody);

    // Process the event using the service method
    await handlePaystackWebhookEvent(event);

    // Always respond with 200 to acknowledge receipt, even if there was an issue processing
    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Webhook received',
    });
  }
);

export const getPaymentController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { reference } = req.params;
    const payment = await getPaymentByReference(reference);

    // Check if user is authorized to access this payment
    if (
      payment.customer._id.toString() !== req.user?._id.toString() &&
      payment.expert._id.toString() !== req.user?._id.toString() &&
      req.user?.role !== 'admin'
    ) {
      return next(
        new BadRequestException('You are not authorized to access this payment')
      );
    }

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      data: payment,
    });
  }
);

export const getUserPaymentsController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = new mongoose.Types.ObjectId(req.user?._id.toString());
    const role = req.query.role === 'expert' ? 'expert' : 'customer';

    // Parse pagination params with defaults
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const payments = await getUserPayments(userId, role, page, limit);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      payments: payments.payments,
      ...payments.meta,
    });
  }
);

export const getCustomerPaymentAnalytics = AsyncHandler(
  async (req: Request, res: Response) => {
    const { year, userId } = req.query;

    // Validate year parameter
    const selectedYear = parseInt(year as string) || new Date().getFullYear();

    // Build match conditions
    const matchConditions: any = {
      status: 'success', // Only count successful payments
      createdAt: {
        $gte: new Date(`${selectedYear}-01-01`),
        $lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
      },
    };

    // If userId is provided, filter by customer
    if (req.user?._id) {
      matchConditions.customer = new mongoose.Types.ObjectId(
        req.user?._id as string
      );
    }

    // Aggregate monthly data
    const monthlyData = await Payment.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const monthNames = [
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

    const monthly = monthNames.map((month, index) => {
      const monthData = monthlyData.find((data) => data._id === index + 1);
      return {
        month,
        amount: monthData ? Math.round(monthData.amount) : 0,
      };
    });

    // Calculate summary statistics
    const totalAmount = monthlyData.reduce(
      (sum, month) => sum + month.amount,
      0
    );
    const totalTransactions = monthlyData.reduce(
      (sum, month) => sum + month.count,
      0
    );
    const avgMonthly =
      monthlyData.length > 0 ? Math.round(totalAmount / 12) : 0;

    const analytics = {
      monthly,
      total: Math.round(totalAmount),
      avg: avgMonthly,
      transactions: totalTransactions,
    };

    res.status(200).json({
      success: true,
      data: analytics,
    });
  }
);

// Get available years for the dropdown
export const getAvailableYears = AsyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.query;

    const matchConditions: any = {
      status: 'success',
    };

    if (userId) {
      matchConditions.customer = new mongoose.Types.ObjectId(userId as string);
    }

    const years = await Payment.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: { $year: '$createdAt' },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    const availableYears = years.map((year) => year._id);

    res.status(200).json({
      success: true,
      data: availableYears,
    });
  }
);
