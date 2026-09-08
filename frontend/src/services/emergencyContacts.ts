import { api } from '../lib/api';
import type { EmergencyContact } from '../types';

export interface CreateEmergencyContactPayload {
  name: string;
  relationship: string;
  phone_number: string;
  priority?: 'primary' | 'secondary' | string;
  sms_enabled?: boolean;
}

export interface UpdateEmergencyContactPayload {
  name?: string;
  relationship?: string;
  phone_number?: string;
  priority?: 'primary' | 'secondary' | string;
  sms_enabled?: boolean;
}

export const emergencyContactsService = {
  async list(): Promise<EmergencyContact[]> {
    return api.get<EmergencyContact[]>('/emergency-contacts');
  },

  async create(payload: CreateEmergencyContactPayload): Promise<EmergencyContact> {
    return api.post<EmergencyContact>('/emergency-contacts', payload);
  },

  async update(id: string, payload: UpdateEmergencyContactPayload): Promise<EmergencyContact> {
    return api.put<EmergencyContact>(`/emergency-contacts/${id}`, payload);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/emergency-contacts/${id}`);
  },
};
