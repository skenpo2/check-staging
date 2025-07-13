import z from 'zod';

export const BookingSchema = z.object({
  customer: z.string().optional(),
  listing: z.string(),
  location: z.string(),
  note: z.string().optional(),
  scheduledAt: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()),
});

export type IBooking = z.infer<typeof BookingSchema>;
