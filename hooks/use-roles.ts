import { useCallback } from 'react';
import { UserRole } from '@/lib/constants/roles';
import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_HIERARCHY,
  canManageRoles,
  canManageUsers,
  isHigherRole,
  getDefaultRedirect
} from '@/lib/constants/roles';

export const useRoles = (userRole?: UserRole) => {
  const getRoleLabel = useCallback((role: UserRole) => {
    return ROLE_LABELS[role];
  }, []);

  const getRoleDescription = useCallback((role: UserRole) => {
    return ROLE_DESCRIPTIONS[role];
  }, []);

  const getAvailableRoles = useCallback(() => {
    if (!userRole) return [];

    // Super admin can assign all roles
    if (userRole === 'super_admin') {
      return ROLE_HIERARCHY;
    }

    // Administrator can assign all roles except super_admin
    if (userRole === 'administrator') {
      return ROLE_HIERARCHY.filter((role) => role !== 'super_admin');
    }

    // Institution coordinator can assign all roles except super_admin
    if (userRole === 'institution_coordinator') {
      return ROLE_HIERARCHY.filter((role) => role !== 'super_admin');
    }
    // Other roles can't assign roles
    return [];
  }, [userRole]);

  const canManageRole = useCallback(
    (targetRole: UserRole) => {
      if (!userRole) return false;

      // Check if user has permission to manage roles
      if (!canManageRoles(userRole)) return false;

      // Super admin can manage all roles
      if (userRole === 'super_admin') return true;

      // Administrator can't manage super_admin role
      if (userRole === 'administrator' && targetRole === 'super_admin') {
        return false;
      }

      // Institution coordinator can't manage super_admin role
      if (
        userRole === 'institution_coordinator' &&
        targetRole === 'super_admin'
      ) {
        return false;
      }

      // Can only manage lower roles
      return isHigherRole(userRole, targetRole);
    },
    [userRole]
  );

  const hasPermission = useCallback(
    (requiredRole: UserRole) => {
      if (!userRole) return false;
      return !isHigherRole(requiredRole, userRole);
    },
    [userRole]
  );

  const getLandingPage = useCallback(() => {
    return getDefaultRedirect(userRole);
  }, [userRole]);

  return {
    getRoleLabel,
    getRoleDescription,
    getAvailableRoles,
    canManageRole,
    hasPermission,
    getLandingPage,
    canManageRoles: userRole ? canManageRoles(userRole) : false,
    canManageUsers: userRole ? canManageUsers(userRole) : false,
    isHigherRole
  };
};
