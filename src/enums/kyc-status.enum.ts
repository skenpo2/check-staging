export const KycStatusEnum = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const;

export type KycStatusEnumType =
  (typeof KycStatusEnum)[keyof typeof KycStatusEnum];

export const ALLOWED_STATUS_TRANSITIONS: Record<
  KycStatusEnumType,
  KycStatusEnumType[]
> = {
  [KycStatusEnum.PENDING]: [KycStatusEnum.SUBMITTED],
  [KycStatusEnum.SUBMITTED]: [KycStatusEnum.COMPLETED, KycStatusEnum.REJECTED],
  [KycStatusEnum.REJECTED]: [],
  [KycStatusEnum.COMPLETED]: [],
};
