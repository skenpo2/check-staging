export const ListingAvailabilityEnum = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;

export type ListingAvailabilityEnumType =
  (typeof ListingAvailabilityEnum)[keyof typeof ListingAvailabilityEnum];

export const ListingStatusEnum = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

export type ListingStatusEnumType =
  (typeof ListingStatusEnum)[keyof typeof ListingStatusEnum];
