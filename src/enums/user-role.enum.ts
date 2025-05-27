export const RoleEnum = {
  CUSTOMER: 'CUSTOMER',
  EXPERT: 'EXPERT',
  ADMIN: 'ADMIN',
};

export type RoleEnumType = keyof typeof RoleEnum;
