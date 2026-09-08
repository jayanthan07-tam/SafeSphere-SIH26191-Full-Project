import { api, setToken } from '../lib/api';
import type { User, UserRole } from '../types';

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  phone?: string;
  mobile_number?: string;
  role: 'citizen' | 'family_member';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
  role?: string;
}

export const authService = {
  async login(email: string, password: string, role?: string, rememberMe: boolean = true): Promise<{ token: string; user: User }> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password, role });
    setToken(res.access_token, rememberMe);
    let user = res.user;
    if (!user) {
      user = await api.get<User>('/auth/me');
    }
    return { token: res.access_token, user };
  },

  async register(payload: RegisterPayload, rememberMe: boolean = true): Promise<{ token: string; user: User }> {
    const res = await api.post<AuthResponse>('/auth/register', payload);
    setToken(res.access_token, rememberMe);
    let user = res.user;
    if (!user) {
      user = await api.get<User>('/auth/me');
    }
    return { token: res.access_token, user };
  },

  async getMe(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  async updateMe(data: Partial<User>): Promise<User> {
    return api.patch<User>('/auth/me', data);
  },

  logout(): void {
    setToken(null);
  },
};
