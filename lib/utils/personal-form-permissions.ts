// lib/utils/personal-form-permissions.ts
// Utility functions for personal form permission checks

import {
  PersonalFormCollaborator,
  PersonalFormPermission,
  PersonalFormPermissions
} from '@/types/personal-forms';

/**
 * Check if a collaborator has a specific permission
 * @param collaborator The collaborator object
 * @param permission The permission to check
 * @returns True if collaborator has the permission
 */
export function hasPermission(
  collaborator: PersonalFormCollaborator | null | undefined,
  permission: PersonalFormPermission
): boolean {
  if (!collaborator) return false;

  // Owners have all permissions
  if (collaborator.is_owner) return true;

  // Check specific permission
  return collaborator[permission] === true;
}

/**
 * Check if a collaborator has ANY of the specified permissions
 * @param collaborator The collaborator object
 * @param permissions Array of permissions to check
 * @returns True if collaborator has at least one permission
 */
export function hasAnyPermission(
  collaborator: PersonalFormCollaborator | null | undefined,
  permissions: PersonalFormPermission[]
): boolean {
  if (!collaborator) return false;

  // Owners have all permissions
  if (collaborator.is_owner) return true;

  // Check if any permission is granted
  return permissions.some((permission) => collaborator[permission] === true);
}

/**
 * Check if a collaborator has ALL of the specified permissions
 * @param collaborator The collaborator object
 * @param permissions Array of permissions to check
 * @returns True if collaborator has all permissions
 */
export function hasAllPermissions(
  collaborator: PersonalFormCollaborator | null | undefined,
  permissions: PersonalFormPermission[]
): boolean {
  if (!collaborator) return false;

  // Owners have all permissions
  if (collaborator.is_owner) return true;

  // Check if all permissions are granted
  return permissions.every((permission) => collaborator[permission] === true);
}

/**
 * Check if a user is an owner
 * @param collaborator The collaborator object
 * @returns True if collaborator is an owner
 */
export function isOwner(
  collaborator: PersonalFormCollaborator | null | undefined
): boolean {
  return collaborator?.is_owner === true;
}

/**
 * Get all granted permissions for a collaborator
 * @param collaborator The collaborator object
 * @returns Array of granted permissions
 */
export function getGrantedPermissions(
  collaborator: PersonalFormCollaborator | null | undefined
): PersonalFormPermission[] {
  if (!collaborator) return [];

  const permissions: PersonalFormPermission[] = [];

  if (collaborator.can_edit_structure) permissions.push('can_edit_structure');
  if (collaborator.can_view_responses) permissions.push('can_view_responses');
  if (collaborator.can_export_data) permissions.push('can_export_data');
  if (collaborator.can_manage_collaborators)
    permissions.push('can_manage_collaborators');

  return permissions;
}

/**
 * Count the number of permissions granted
 * @param collaborator The collaborator object
 * @returns Number of granted permissions
 */
export function countPermissions(
  collaborator: PersonalFormCollaborator | null | undefined
): number {
  return getGrantedPermissions(collaborator).length;
}

/**
 * Check if a collaborator can edit the form
 * @param collaborator The collaborator object
 * @returns True if collaborator can edit
 */
export function canEdit(
  collaborator: PersonalFormCollaborator | null | undefined
): boolean {
  return hasPermission(collaborator, 'can_edit_structure');
}

/**
 * Check if a collaborator can view responses
 * @param collaborator The collaborator object
 * @returns True if collaborator can view responses
 */
export function canViewResponses(
  collaborator: PersonalFormCollaborator | null | undefined
): boolean {
  return hasPermission(collaborator, 'can_view_responses');
}

/**
 * Check if a collaborator can export data
 * @param collaborator The collaborator object
 * @returns True if collaborator can export
 */
export function canExport(
  collaborator: PersonalFormCollaborator | null | undefined
): boolean {
  return hasPermission(collaborator, 'can_export_data');
}

/**
 * Check if a collaborator can manage other collaborators
 * @param collaborator The collaborator object
 * @returns True if collaborator can manage
 */
export function canManageCollaborators(
  collaborator: PersonalFormCollaborator | null | undefined
): boolean {
  return hasPermission(collaborator, 'can_manage_collaborators');
}

/**
 * Create a full permissions object (all permissions granted)
 * @param isOwner Whether the user should be an owner
 * @returns Complete permissions object
 */
export function createFullPermissions(isOwner = true): PersonalFormPermissions & {
  is_owner: boolean;
} {
  return {
    can_edit_structure: true,
    can_view_responses: true,
    can_export_data: true,
    can_manage_collaborators: true,
    is_owner: isOwner
  };
}

/**
 * Create a permissions object with no permissions
 * @returns Empty permissions object
 */
export function createNoPermissions(): PersonalFormPermissions & {
  is_owner: boolean;
} {
  return {
    can_edit_structure: false,
    can_view_responses: false,
    can_export_data: false,
    can_manage_collaborators: false,
    is_owner: false
  };
}

/**
 * Create a view-only permissions object
 * @returns View-only permissions
 */
export function createViewOnlyPermissions(): PersonalFormPermissions & {
  is_owner: boolean;
} {
  return {
    can_edit_structure: false,
    can_view_responses: true,
    can_export_data: false,
    can_manage_collaborators: false,
    is_owner: false
  };
}

/**
 * Create an editor permissions object (can edit and view)
 * @returns Editor permissions
 */
export function createEditorPermissions(): PersonalFormPermissions & {
  is_owner: boolean;
} {
  return {
    can_edit_structure: true,
    can_view_responses: true,
    can_export_data: true,
    can_manage_collaborators: false,
    is_owner: false
  };
}

/**
 * Merge permission updates with existing permissions
 * @param current Current permissions
 * @param updates Permission updates
 * @returns Merged permissions
 */
export function mergePermissions(
  current: Partial<PersonalFormPermissions>,
  updates: Partial<PersonalFormPermissions>
): PersonalFormPermissions {
  return {
    can_edit_structure: updates.can_edit_structure ?? current.can_edit_structure ?? false,
    can_view_responses: updates.can_view_responses ?? current.can_view_responses ?? false,
    can_export_data: updates.can_export_data ?? current.can_export_data ?? false,
    can_manage_collaborators:
      updates.can_manage_collaborators ?? current.can_manage_collaborators ?? false
  };
}

/**
 * Validate permission dependencies
 * For example: can_export_data should require can_view_responses
 * @param permissions Permissions to validate
 * @returns Validated permissions with dependencies enforced
 */
export function validatePermissionDependencies(
  permissions: Partial<PersonalFormPermissions>
): PersonalFormPermissions {
  const validated = { ...permissions };

  // If can_export_data is true, can_view_responses must also be true
  if (validated.can_export_data && !validated.can_view_responses) {
    validated.can_view_responses = true;
  }

  return {
    can_edit_structure: validated.can_edit_structure ?? false,
    can_view_responses: validated.can_view_responses ?? false,
    can_export_data: validated.can_export_data ?? false,
    can_manage_collaborators: validated.can_manage_collaborators ?? false
  };
}

/**
 * Get permission level description for UI
 * @param collaborator The collaborator object
 * @returns Human-readable permission description
 */
export function getPermissionLevelDescription(
  collaborator: PersonalFormCollaborator | null | undefined
): string {
  if (!collaborator) return 'No Access';

  if (collaborator.is_owner) return 'Owner (Full Access)';

  const permissions = getGrantedPermissions(collaborator);

  if (permissions.length === 0) return 'No Permissions';
  if (permissions.length === 4) return 'Full Access';

  const labels = permissions.map((p) => {
    switch (p) {
      case 'can_edit_structure':
        return 'Edit';
      case 'can_view_responses':
        return 'View';
      case 'can_export_data':
        return 'Export';
      case 'can_manage_collaborators':
        return 'Manage';
      default:
        return '';
    }
  });

  return labels.filter(Boolean).join(', ');
}

/**
 * Check if permissions are equivalent
 * @param a First permission set
 * @param b Second permission set
 * @returns True if permissions are the same
 */
export function arePermissionsEqual(
  a: Partial<PersonalFormPermissions>,
  b: Partial<PersonalFormPermissions>
): boolean {
  return (
    a.can_edit_structure === b.can_edit_structure &&
    a.can_view_responses === b.can_view_responses &&
    a.can_export_data === b.can_export_data &&
    a.can_manage_collaborators === b.can_manage_collaborators
  );
}
