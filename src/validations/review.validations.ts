import z from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().min(2).max(1000),
});

export type ICreateReviewSchema = z.infer<typeof createReviewSchema>;
