import React from 'react';
import { Navigate } from 'react-router-dom';
import { getRoleLandingPath, useAuth } from '../context/AuthContext';
import { Loading } from './Loading';
import type { UserRole } from '../types';

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleProtectedRoute({ allowedRoles, children }: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading label="Verifying role permissions…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizeRole = (role?: string): string => {
    if (!role) return '';
    const r = role.toLowerCase();
    if (r === 'admin' || r === 'administrator') return 'admin';
    if (r === 'authority' || r === 'district_officer') return 'authority';
    return r;
  };

  const userNorm = normalizeRole(user.role);
  const isAllowed = allowedRoles.some((r) => normalizeRole(r) === userNorm);

  if (!isAllowed) {
    return <Navigate to={getRoleLandingPath(user.role)} replace />;
  }

  return <>{children}</>;
}
