import { RoleEnum, RoleType } from '../enums/user-role.enum';

export const getUserRole = (user: any): RoleType | null => {
  if (!user || typeof user.role !== 'string') return null;

  const normalizedRole = user.role.toUpperCase();

  if (Object.values(RoleEnum).includes(normalizedRole as RoleType)) {
    return normalizedRole as RoleType;
  }

  return null;
};
