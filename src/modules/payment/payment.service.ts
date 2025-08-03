import Payment, {
  IPayment,
  IPaymentDocument,
  PaymentStatus,
} from './model/payment.model';
import {
  BadRequestException,
  InternalServerException,
} from '../../utils/appError';
import mongoose, { ClientSession } from 'mongoose';
import logger from '../../utils/logger';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Booking from '../booking/model/booking.model';
import { BookingStatusEnum } from '../../enums/booking-status.enum';
const Paystack = require('paystack');

dotenv.config();

// Initialize Paystack with the secret key
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
const paystack = Paystack(paystackSecretKey);

/**
 * Initialize a payment with Paystack
 * @param amount - Amount in kobo (smallest currency unit)
 * @param email - Customer email
 * @param reference - Optional reference string
 * @param metadata - Optional metadata object
 * @returns Paystack transaction initialization response
 */
export const initializePaystackPayment = async (
  amount: number,
  email: string,
  reference?: string,
  metadata?: Record<string, any>
) => {
  try {
    const paymentData = {
      amount: amount * 100,
      email: email,
      reference: reference || generateTransactionReference(),
      metadata: metadata || {},
    };

    const response = await paystack.transaction.initialize(paymentData);

    if (!response.status) {
      logger.error(
        `Failed to initialize Paystack payment: ${JSON.stringify(response)}`
      );
      throw new InternalServerException('Failed to initialize payment');
    }

    return response.data;
  } catch (error) {
    logger.error(`Error initializing Paystack payment: ${error}`);
    throw new InternalServerException('Payment service unavailable');
  }
};

/**
 * Verify a Paystack payment transaction
 * @param reference - The transaction reference to verify
 * @returns Verified transaction data
 */
export const verifyPaystackPayment = async (reference: string) => {
  try {
    const response = await paystack.transaction.verify(reference);

    if (!response.status) {
      logger.error(
        `Failed to verify Paystack payment: ${JSON.stringify(response)}`
      );
      throw new BadRequestException('Failed to verify payment');
    }

    return response.data;
  } catch (error) {
    logger.error(`Error verifying Paystack payment: ${error}`);
    throw new InternalServerException(
      'Payment verification service unavailable'
    );
  }
};

/**
 * Create a payment record in the database
 * @param paymentData - Payment data to store
 * @returns Created payment document
 */

export const createPaymentRecord = async (
  paymentData: {
    booking: string;
    customer: string;
    service: string;
    expert: string;
    amount: number;
    platformFee?: number;
    transactionId?: string;
    transactionReference: string;
    platform?: string;
    status: PaymentStatus;
  },
  session?: ClientSession // optional session parameter
) => {
  try {
    // Calculate platform fee if not provided
    if (!paymentData.platformFee) {
      paymentData.platformFee = Math.round(paymentData.amount * 0.05);
    }

    const payment = new Payment({
      ...paymentData,
      platform: paymentData.platform || 'Paystack',
    });

    await payment.save({ session }); //Pass session here

    return payment;
  } catch (error) {
    logger.error(`Error creating payment record: ${error}`);
    if (error instanceof mongoose.Error.ValidationError) {
      throw new BadRequestException(error.message);
    }
    throw new InternalServerException('Failed to create payment record');
  }
};

/**
 * Update payment status in the database
 * @param reference - Transaction reference
 * @param status - New payment status
 * @returns Updated payment document
 */
export const updatePaymentStatus = async (
  reference: string,
  status: PaymentStatus,
  transactionId?: string,
  session?: ClientSession
): Promise<IPaymentDocument> => {
  try {
    const payment = await Payment.findOne({
      transactionReference: reference,
    }).session(session ?? null);

    if (!payment) {
      throw new BadRequestException('Payment record not found');
    }

    if (transactionId) {
      payment.transactionId = transactionId;
    }

    await payment.updateStatus(status, session);

    return payment;
  } catch (error) {
    logger.error(`Error updating payment status: ${error}`);
    if (error instanceof BadRequestException) throw error;
    throw new InternalServerException('Failed to update payment status');
  }
};

/**
 * Get payment by transaction reference
 * @param reference - Transaction reference
 * @returns Payment document
 */
export const getPaymentByReference = async (reference: string) => {
  try {
    const payment = await Payment.findOne({ transactionReference: reference })
      .populate('customer', 'name email')
      .populate('expert', 'name email')
      .populate('service', 'title description')
      .populate('booking', 'date');

    if (!payment) {
      throw new BadRequestException('Payment record not found');
    }

    return payment;
  } catch (error) {
    logger.error(`Error fetching payment by reference: ${error}`);
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new InternalServerException('Failed to fetch payment record');
  }
};

/**
 * Generate a unique transaction reference
 * @returns Unique transaction reference string
 */
export const generateTransactionReference = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `CHS-${timestamp}-${random}`;
};

/**
 * Get all payments for a user (either as customer or expert)
 * @param userId - User ID to fetch payments for
 * @param role - Role to filter by ('customer' or 'expert')
 * @returns Array of payment documents
 */
export const getUserPayments = async (
  userId: mongoose.Types.ObjectId,
  role: 'customer' | 'expert',
  page = 1,
  limit = 10
) => {
  try {
    const query =
      role === 'customer' ? { customer: userId } : { expert: userId };

    const skip = (page - 1) * limit;

    const [payments, totalRecords] = await Promise.all([
      Payment.find(query)
        .populate('customer', 'name email')
        .populate('expert', 'name email')
        .populate('service', 'title description')
        .populate('booking', 'date')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      payments,
      meta: {
        totalRecords,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  } catch (error) {
    logger.error(`Error fetching user payments: ${error}`);
    throw new InternalServerException('Failed to fetch payment records');
  }
};

/**
 * Verify Paystack webhook signature
 * @param signature - The signature from the webhook request header
 * @param payload - The request body as a string
 * @returns Whether the signature is valid
 */
export const verifyPaystackWebhookSignature = (
  signature: string,
  payload: string
): boolean => {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      logger.error('Paystack secret key not configured');
      return false;
    }

    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    return signature === computedHash;
  } catch (error) {
    logger.error(`Error verifying webhook signature: ${error}`);
    return false;
  }
};

/**
 * Handle Paystack webhook event
 * @param event - The webhook event payload
 * @returns Status of the operation
 */
export const handlePaystackWebhookEvent = async (
  event: any
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(event);
    const eventType = event.event;

    if (eventType === 'charge.success') {
      const data = event.data;
      const reference = data.reference;

      // Update payment status to success
      const payment = await updatePaymentStatus(
        reference,
        'success',
        data.id.toString()
      );

      const booking = await Booking.findOne({
        id: payment.booking,
        status: BookingStatusEnum.CONFIRMED,
      });

      // Update booking status only if it's not already PAID
      if (booking && booking.status !== BookingStatusEnum.PAID) {
        booking.status = BookingStatusEnum.PAID;
        booking.payment = payment._id as mongoose.Types.ObjectId;
        await booking.save();
      }

      logger.info(`Payment successful for reference: ${reference}`);
      return { success: true, message: 'Payment successful' };
    } else if (eventType === 'charge.failed') {
      const data = event.data;
      const reference = data.reference;

      // Update payment status to failed
      await updatePaymentStatus(reference, 'failed');

      logger.info(`Payment failed for reference: ${reference}`);
      return { success: true, message: 'Payment failed status updated' };
    }

    return { success: true, message: 'Event processed' };
  } catch (error) {
    logger.error(`Error handling webhook event: ${error}`);
    return { success: false, message: 'Error processing event' };
  }
};
