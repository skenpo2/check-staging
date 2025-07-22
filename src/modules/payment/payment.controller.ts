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

/**
 * Initialize a payment transaction with Paystack
 */
export const initializePaymentController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Parse and validate request body with Zod schema
    const { bookingId } = InitializePaymentSchema.parse({ ...req.body });

    console.log(bookingId);

    const isBooking = await Booking.findOne({
      _id: bookingId,
      status: BookingStatusEnum.CONFIRMED,
      customer: req.user?._id,
    });

    console.log(isBooking);

    if (!isBooking) {
      throw new NotFoundException(
        'Booking Not found or Booking has been settled'
      );
    }

    // Generate a unique transaction reference
    const reference = generateTransactionReference();

    // Store metadata for use in webhook/callback
    const metadata = {
      bookingId,
      serviceId: isBooking.listing,
      expertId: isBooking.expert,
      customerId: isBooking.customer,
    };

    // Initialize payment with Paystack
    const paymentInitResult = await initializePaystackPayment(
      isBooking.price,
      req.user?.email,
      reference,
      metadata
    );

    // Create a pending payment record in our database
    await createPaymentRecord({
      booking: bookingId,
      customer: req.user?._id.toString(),
      service: isBooking?.listing.toString(),
      expert: isBooking?.expert.toString(),
      amount: isBooking.price,
      transactionReference: reference,
      status: 'pending',
    });

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      data: {
        authorizationUrl: paymentInitResult.authorization_url,
        accessCode: paymentInitResult.access_code,
        reference: paymentInitResult.reference,
      },
    });
  }
);

export const verifyPaymentController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { reference } = VerifyPaymentSchema.parse({ ...req.body });

    // Verify payment with Paystack
    const verificationResult = await verifyPaystackPayment(reference);

    // Check if payment was successful
    if (verificationResult.status === 'success') {
      // Update our payment record
      await updatePaymentStatus(
        reference,
        'success',
        verificationResult.id.toString()
      );
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
      // Update our payment record to failed
      await updatePaymentStatus(reference, 'failed');

      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'Payment verification failed',
        data: verificationResult,
      });
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
