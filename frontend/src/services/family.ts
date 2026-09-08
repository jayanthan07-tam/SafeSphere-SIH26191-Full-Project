import { api } from '../lib/api';
import type { FamilyGroup } from '../types';

export const familyService = {
  async getFamilyGroup(): Promise<FamilyGroup> {
    return api.get<FamilyGroup>('/family/portal/group');
  },

  async joinFamily(join_code: string, relationship: string = 'Family Member'): Promise<FamilyGroup> {
    return api.post<FamilyGroup>('/family/join', { join_code, relationship });
  },

  async checkIn(
    status: string,
    location_sharing: boolean = false,
    latitude?: number | null,
    longitude?: number | null,
  ): Promise<FamilyGroup> {
    return api.post<FamilyGroup>('/family/check-in', {
      status,
      safety_status: status,
      location_sharing,
      latitude,
      longitude,
    });
  },

  async regenerateCode(): Promise<{ join_code: string; message: string }> {
    return api.post<{ join_code: string; message: string }>('/family/regenerate-code');
  },
};
