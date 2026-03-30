export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMINISTRATOR = 'administrator',
  INSTITUTION_COORDINATOR = 'institution_coordinator',
  EVENT_COORDINATOR = 'event_coordinator',
  STAFF = 'staff',
  STUDENT = 'student',
  PUBLIC = 'public'
}

// Type guard for UserRole
export const isUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMINISTRATOR]: 'Administrator',
  [UserRole.INSTITUTION_COORDINATOR]: 'Institution Coordinator',
  [UserRole.EVENT_COORDINATOR]: 'Event Coordinator',
  [UserRole.STAFF]: 'Staff',
  [UserRole.STUDENT]: 'Student',
  [UserRole.PUBLIC]: 'Public'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:
    'Full access across all institutions and system configuration',
  [UserRole.ADMINISTRATOR]: 'Manage institutions, users, and system settings',
  [UserRole.INSTITUTION_COORDINATOR]:
    'Manage specific institution events and forms',
  [UserRole.EVENT_COORDINATOR]: 'Create and manage events and related forms',
  [UserRole.STAFF]: 'Assist with event operations and data management',
  [UserRole.STUDENT]: 'Access to view events and fill forms',
  [UserRole.PUBLIC]: 'Access to public forms only'
};

// Role hierarchy from highest (0) to lowest (6)
export const ROLE_HIERARCHY = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMINISTRATOR,
  UserRole.INSTITUTION_COORDINATOR,
  UserRole.EVENT_COORDINATOR,
  UserRole.STAFF,
  UserRole.STUDENT,
  UserRole.PUBLIC
];

export const DEFAULT_ROLE = UserRole.PUBLIC;

// Default landing pages for each role
export const ROLE_LANDING_PAGES: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '/admin/dashboard',
  [UserRole.ADMINISTRATOR]: '/admin/dashboard',
  [UserRole.INSTITUTION_COORDINATOR]: '/institution/dashboard',
  [UserRole.EVENT_COORDINATOR]: '/events/dashboard',
  [UserRole.STAFF]: '/staff/dashboard',
  [UserRole.STUDENT]: '/dashboard',
  [UserRole.PUBLIC]: '/forms'
};

// Role management permissions
export const canManageRoles = (userRole: UserRole): boolean => {
  return [
    UserRole.SUPER_ADMIN,
    UserRole.ADMINISTRATOR,
    UserRole.INSTITUTION_COORDINATOR
  ].includes(userRole);
};

// User management permissions
export const canManageUsers = (userRole: UserRole): boolean => {
  return [
    UserRole.SUPER_ADMIN,
    UserRole.ADMINISTRATOR,
    UserRole.INSTITUTION_COORDINATOR
  ].includes(userRole);
};

// Check if one role is higher than another
export const isHigherRole = (role1: UserRole, role2: UserRole): boolean => {
  return ROLE_HIERARCHY.indexOf(role1) < ROLE_HIERARCHY.indexOf(role2);
};

export const getDefaultRedirect = (role?: UserRole): string => {
  if (!role) return '/auth/login';
  return ROLE_LANDING_PAGES[role];
};
