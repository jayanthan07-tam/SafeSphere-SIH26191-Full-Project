import { api } from '../lib/api';
import type { SOS } from '../types';

export interface CreateSOSPayload {
  latitude: number;
  longitude: number;
  caller_name?: string;
  phone?: string;
  hazard_type?: string;
  message?: string;
  transcript?: string;
  special_needs?: string[];
  people_count?: number;
}

export interface PublicSOSPayload extends CreateSOSPayload {
  caller_name: string;
  phone: string;
}

export const sosService = {
  async createSOS(payload: CreateSOSPayload): Promise<SOS> {
    return api.post<SOS>('/sos', payload);
  },

  async createPublicSOS(payload: PublicSOSPayload): Promise<SOS> {
    return api.post<SOS>('/sos/public', payload);
  },

  async getMySOS(): Promise<SOS[]> {
    return api.get<SOS[]>('/sos/my');
  },

  async getActiveSOS(): Promise<SOS[]> {
    return api.get<SOS[]>('/sos/active');
  },

  async getAllSOS(status?: string): Promise<SOS[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<SOS[]>(`/sos${query}`);
  },

  async updateStatus(id: string, status: string): Promise<SOS> {
    return api.patch<SOS>(`/sos/${id}/status`, { status });
  },

  async assignOfficer(id: string, assigned_to: string): Promise<SOS> {
    return api.patch<SOS>(`/sos/${id}/assign`, { assigned_to });
  },
};
