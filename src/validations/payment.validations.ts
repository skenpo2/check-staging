import { z } from 'zod';

// Schema for initializing a payment
export const InitializePaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
});

// Schema for verifying a payment
export const VerifyPaymentSchema = z.object({
  reference: z.string().min(1, 'Transaction reference is required'),
});

// Schema for payment webhook event
export const WebhookEventSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.number(),
    reference: z.string(),
    status: z.string(),
    amount: z.number(),
  }),
});
