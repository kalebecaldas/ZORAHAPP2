import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { useAuth } from './useAuth';

type Permission = 'users' | 'settings' | 'workflows' | 'patients' | 'conversations' | 'stats' | 'aiConfig' | 'test';

interface RolePermissions {
  [key: string]: boolean;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.role) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/api/permissions');
        const rolePermissions = response.data?.permissions?.[user.role] || {};
        setPermissions(rolePermissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        // Fallback para permissões padrão baseadas no role
        const defaults: Record<string, RolePermissions> = {
          MASTER: { users: true, settings: true, workflows: true, patients: true, conversations: true, stats: true, aiConfig: true, test: true },
          ADMIN: { users: true, settings: true, workflows: true, patients: true, conversations: true, stats: true, aiConfig: true, test: true },
          SUPERVISOR: { users: false, settings: false, workflows: false, patients: true, conversations: true, stats: true, aiConfig: false, test: false },
          ATENDENTE: { users: false, settings: false, workflows: false, patients: false, conversations: true, stats: false, aiConfig: false, test: false }
        };
        setPermissions(defaults[user.role] || {});
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.role]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions[permission] === true;
  };

  const hasAnyPermission = (perms: Permission[]): boolean => {
    return perms.some(p => hasPermission(p));
  };

  const hasAllPermissions = (perms: Permission[]): boolean => {
    return perms.every(p => hasPermission(p));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
