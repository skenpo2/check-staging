import { z } from 'zod';

export const GetAllExpertReviewsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  expert: z.string(),
});
