import z from 'zod';

export const BookingSchema = z.object({
  customer: z.string(),
  service: z.string(),
  expert: z.string(),
  location: z.string(),
  scheduledAt: z.date(),
});

export type IBooking = z.infer<typeof BookingSchema>;
