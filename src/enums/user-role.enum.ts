export const RoleEnum = {
  CUSTOMER: 'CUSTOMER',
  EXPERT: 'EXPERT',
  ADMIN: 'ADMIN',
};

export type RoleEnumType = (typeof RoleEnum)[keyof typeof RoleEnum];
