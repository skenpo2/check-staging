import z from 'zod';

export const BookingSchema = z.object({
  customer: z.string().optional(),
  listing: z.string(),
  location: z
    .string()
    .trim()
    .min(3, 'Location must be at least 3 characters.')
    .max(200, 'Location cannot exceed 200 characters.'),
  note: z
    .string()
    .trim()
    .max(500, 'Note cannot exceed 500 characters.')
    .optional(),
  scheduledAt: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()),
});

export type IBooking = z.infer<typeof BookingSchema>;
