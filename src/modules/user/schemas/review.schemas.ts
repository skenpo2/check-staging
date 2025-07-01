import { z } from 'zod';

export const ReviewSchema = z.object({
  bookingId: z.string(),
  customerId: z.string(),
  expertId: z.string(),
  serviceId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().max(1000).optional()
});

export type IReview = z.infer<typeof ReviewSchema>;