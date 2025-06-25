import z from 'zod';

export const CreateListingSchema = z.object({
  expert: z.string(),
  title: z.string()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title must not exceed 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters long')
    .max(1000, 'Description must not exceed 1000 characters'),
  price: z.number()
    .min(0, 'Price cannot be negative')
    .max(1000000, 'Price is too high'),
  category: z.string().optional(),
  location: z.string(),
  availability: z.array(z.date()),
  active: z.boolean().default(true),
});

export const UpdateListingSchema = CreateListingSchema.partial();

export type ICreateListing = z.infer<typeof CreateListingSchema>;
export type IUpdateListing = z.infer<typeof UpdateListingSchema>;
