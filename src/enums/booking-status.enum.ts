export const BookingStatusEnum = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  PAID: 'PAID',
  DONE: 'DONE',
  COMPLETED: 'COMPLETED',
} as const;

export const allowedForCustomer = ['CANCELLED', 'COMPLETED'];
export const allowedForExpert = ['CONFIRMED', 'DONE'];

export type BookingStatusEnumType =
  (typeof BookingStatusEnum)[keyof typeof BookingStatusEnum];
