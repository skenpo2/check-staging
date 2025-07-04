import { Request, Response, NextFunction } from 'express';
import { PermissionType } from '../enums/user-role.enum';
import { getUserRole } from '../utils/get-user-role';
import { RolePermissions } from '../utils/role-permission';
import {
  InternalServerException,
  UnauthorizedException,
} from '../utils/appError';
import logger from '../utils/logger';

export const roleGuard = (
  requiredPermissions: PermissionType | PermissionType[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = getUserRole(req.user);

      if (!role) {
        throw new UnauthorizedException('Access denied. User role not found');
      }

      const permissions = RolePermissions[role];
      if (!permissions) {
        throw new UnauthorizedException(
          "Access denied. Role permissions not found.'"
        );
      }

      const required = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // ALL permissions must be present
      const hasAllPermissions = required.every((perm) =>
        permissions.includes(perm)
      );

      if (!hasAllPermissions) {
        throw new UnauthorizedException(
          'Access denied. Missing one or more required permissions'
        );
      }

      next();
    } catch (error) {
      logger.error(error);
      throw new InternalServerException(
        'Internal server error while checking permissions.'
      );
    }
  };
};
