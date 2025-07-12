import z from 'zod';

export const BookingSchema = z.object({
  customer: z.string(),
  listing: z.string(),
  location: z.string(),
  note: z.string().optional(),
  scheduledAt: z.date(),
});

export type IBooking = z.infer<typeof BookingSchema>;
