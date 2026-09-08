import { api } from '../lib/api';
import type { User } from '../types';

export interface CreateStaffPayload {
  email: string;
  full_name: string;
  password: string;
  role: string;
  mobile_number?: string;
  phone?: string;
  state?: string;
  district?: string;
  taluk?: string;
  locality?: string;
}

export interface UpdateUserPayload {
  is_active?: boolean;
  role?: string;
  full_name?: string;
  phone?: string;
  district?: string;
}

export const usersService = {
  async listUsers(role?: string, search?: string): Promise<User[]> {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<User[]>(`/users${query}`);
  },

  async listOfficers(): Promise<User[]> {
    return api.get<User[]>('/users/officers');
  },

  async createStaff(payload: CreateStaffPayload): Promise<User> {
    return api.post<User>('/users', payload);
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    return api.patch<User>(`/users/${id}`, payload);
  },

  async resetPassword(id: string, new_password: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/users/${id}/reset-password`, { new_password });
  },
};
