export type UserRole =
  | 'SuperAdmin'
  | 'PlantAdmin'
  | 'Engineer'
  | 'Technician'
  | 'Operator'
  | 'Auditor'
  | 'Viewer';

export type UserPermission =
  | 'documents:read'
  | 'documents:write'
  | 'documents:delete'
  | 'equipment:read'
  | 'equipment:write'
  | 'workorders:read'
  | 'workorders:write'
  | 'incidents:read'
  | 'incidents:write'
  | 'compliance:read'
  | 'compliance:write'
  | 'kg:read'
  | 'kg:write';

export interface Plant {
  _id?: string;
  plantId: string; // alphanumeric id e.g. PL-001
  name: string;
  location: string;
  industry: string;
  createdAt?: string;
}

export interface User {
  _id?: string;
  email: string;
  name: string;
  role: UserRole;
  plantId: string; // Primary Plant ObjectId
  additionalPlants?: string[]; // Multi-plant ObjectIds
  createdAt?: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  plantId: string;
  additionalPlants?: string[];
  permissions: UserPermission[];
  iat?: number;
  exp?: number;
}
