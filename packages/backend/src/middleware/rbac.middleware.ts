import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserRole } from '@ikip/shared';

// Helper to check if a user has one of the allowed roles
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }

    if (req.user.role === 'SuperAdmin') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: `Forbidden: Role ${req.user.role} does not have access to this resource`,
    });
  };
};

// Map roles to their permission sets for fine-grained checks if needed
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SuperAdmin: ['*'],
  PlantAdmin: ['*'],
  Engineer: [
    'documents:read',
    'documents:write',
    'equipment:read',
    'equipment:write',
    'workorders:read',
    'workorders:write',
    'incidents:read',
    'compliance:read',
    'compliance:write',
    'kg:read',
    'kg:write',
    'dashboard:read'
  ],
  Technician: [
    'documents:read',
    'equipment:read',
    'workorders:read',
    'workorders:write',
    'incidents:read',
    'incidents:write',
    'kg:read',
    'dashboard:read'
  ],
  Operator: [
    'documents:read',
    'equipment:read',
    'kg:read',
    'dashboard:read'
  ],
  Auditor: [
    'documents:read',
    'equipment:read',
    'compliance:read',
    'kg:read',
    'dashboard:read'
  ],
  Viewer: [
    'dashboard:read'
  ]
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }

    const { role } = req.user;

    // SuperAdmin and PlantAdmin get access to everything
    if (role === 'SuperAdmin' || role === 'PlantAdmin') {
      return next();
    }

    const permissions = ROLE_PERMISSIONS[role] || [];
    if (permissions.includes(permission) || permissions.includes('*')) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: `Forbidden: You do not have the required permission: ${permission}`,
    });
  };
};
