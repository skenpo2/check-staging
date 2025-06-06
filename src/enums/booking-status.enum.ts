export const BookingStatusEnum = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export type BookingStatusEnumType =
  (typeof BookingStatusEnum)[keyof typeof BookingStatusEnum];
