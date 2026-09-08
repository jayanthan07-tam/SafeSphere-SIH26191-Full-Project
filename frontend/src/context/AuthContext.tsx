import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';
import { authService, RegisterPayload } from '../services/auth';
import type { User, UserRole } from '../types';

export function getRoleLandingPath(role?: UserRole | string | null): string {
  switch (role) {
    case 'admin':
    case 'administrator':
      return '/admin/dashboard';
    case 'authority':
      return '/authority/dashboard';
    case 'district_officer':
      return '/district/dashboard';
    case 'field_officer':
      return '/field/dashboard';
    case 'citizen':
      return '/citizen/home';
    case 'family_member':
      return '/family/dashboard';
    default:
      return '/login';
  }
}

interface AuthValue {
  user: User | null;
  token: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, role?: string, rememberMe?: boolean) => Promise<User>;
  register: (payload: RegisterPayload, rememberMe?: boolean) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  getLandingPath: () => string;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setCurrentToken] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      setCurrentToken(getToken());
    } catch {
      setUser(null);
      setCurrentToken(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getToken()) {
      refresh();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (
    email: string,
    password: string,
    role?: string,
    rememberMe: boolean = true
  ): Promise<User> => {
    const { token: receivedToken, user: authedUser } = await authService.login(email, password, role, rememberMe);
    setUser(authedUser);
    setCurrentToken(receivedToken);
    return authedUser;
  };

  const register = async (
    payload: RegisterPayload,
    rememberMe: boolean = true
  ): Promise<User> => {
    const { token: receivedToken, user: newUser } = await authService.register(payload, rememberMe);
    setUser(newUser);
    setCurrentToken(receivedToken);
    return newUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setCurrentToken(null);
  };

  const getLandingPath = (): string => {
    return getRoleLandingPath(user?.role);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      accessToken: token,
      isAuthenticated: !!user && !!token,
      loading,
      login,
      register,
      logout,
      refresh,
      getLandingPath,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
