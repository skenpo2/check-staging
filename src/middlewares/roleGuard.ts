import { Request, Response, NextFunction } from 'express';
import { PermissionType } from '../enums/user-role.enum';
import { getUserRole } from '../utils/get-user-role';
import { BadRequestException, UnauthorizedException } from '../utils/appError';
import { RolePermissions } from '../utils/role-permission';
import logger from '../utils/logger';
/**
 * Middleware to guard routes based on user role and required permission.
 * @param requiredPermission - The specific permission required to access the route.
 */
export const roleGuard = (requiredPermission: PermissionType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = getUserRole(req);

      if (!role) {
        throw new BadRequestException('Access denied. User role not found.');
      }

      const permissions = RolePermissions[role];

      if (!permissions || !permissions.includes(requiredPermission)) {
        throw new UnauthorizedException(
          'Access denied. Permission not granted'
        );
      }

      next();
    } catch (error) {
      logger.error('Role guard error:', error);
      throw error;
    }
  };
};
