import z from 'zod';
//

export const CreateListingSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(1000, 'Description must not exceed 1000 characters'),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(1000000, 'Price is too high'),
  category: z.string().optional(),
  location: z.string().min(2).max(100),
  image: z.string().optional(),
  availability: z.enum(['AVAILABLE', 'UNAVAILABLE']),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export const UpdateListingSchema = CreateListingSchema.partial();

export const GetAllListingsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  expertId: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  availability: z.enum(['AVAILABLE', 'UNAVAILABLE']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export type ICreateListing = z.infer<typeof CreateListingSchema>;
export type IUpdateListing = z.infer<typeof UpdateListingSchema>;
