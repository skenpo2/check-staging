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
import { IPaymentDocument } from './model/payment.model';

/**
 * Initialize a payment transaction with Paystack
 */

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
    // Verify webhook signature from Paystack
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      logger.error('No Paystack signature found in webhook request');
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Verify the signature using the service method
    const payload = JSON.stringify(req.body);
    const isValidSignature = verifyPaystackWebhookSignature(signature, payload);

    if (!isValidSignature) {
      logger.error('Invalid Paystack webhook signature');
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Process the event using the service method
    await handlePaystackWebhookEvent(req.body);

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

    const payments = await getUserPayments(userId, role);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      data: payments,
    });
  }
);
