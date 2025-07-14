import { z } from 'zod';

export const ReviewSchema = z.object({
  bookingId: z.string(),
  customerId: z.string(),
  expertId: z.string(),
  listingId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().min(2).max(1000),
});

export const GetAllExpertReviewsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  expert: z.string(),
});

export type IReview = z.infer<typeof ReviewSchema>;
