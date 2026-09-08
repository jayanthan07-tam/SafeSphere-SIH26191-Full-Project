export type UserRole =
  | 'admin'
  | 'administrator'
  | 'authority'
  | 'district_officer'
  | 'field_officer'
  | 'citizen'
  | 'family_member';

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  mobile_number?: string | null;
  phone_number?: string | null;
  full_name: string;
  name?: string;
  role: UserRole;
  state?: string | null;
  district?: string | null;
  taluk?: string | null;
  locality?: string | null;
  preferred_language: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  phone_number: string;
  sms_enabled: boolean;
  priority: 'primary' | 'secondary' | string;
  created_at: string;
}

export interface FamilyGroupMember {
  user_id: string;
  full_name: string;
  email: string;
  relationship: string;
  safety_status: 'SAFE' | 'NEED_HELP' | 'AT_SHELTER' | 'UNABLE_TO_MOVE' | 'SOS_ACTIVE' | 'UNKNOWN' | string;
  status?: string | null;
  location_sharing: boolean;
  location_sharing_enabled?: boolean | null;
  special_assistance?: string[];
  sms_alerts_enabled?: boolean;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_checkin_at?: string | null;
  is_owner: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  join_code?: string | null;
  owner_user_id: string;
  members: FamilyGroupMember[];
}

export interface Habitation {
  id: string;
  code: string;
  name: string;
  state: string;
  district: string;
  taluk: string;
  latitude: number;
  longitude: number;
  population: number;
  households: number;
  vulnerability_score?: number | null;
  infrastructure_resilience_score?: number | null;
  drainage_score?: number | null;
  elevation_m?: number | null;
  slope_deg?: number | null;
  river_distance_km?: number | null;
  rainfall_trend_percent?: number | null;
  land_use_change_percent?: number | null;
  population_growth_rate_percent?: number | null;
  source_name?: string | null;
  last_verified_at?: string | null;
}

export interface RiskAssessment {
  id: string;
  habitation_id: string;
  hazard_type: string;
  current_score: number;
  future_score: number;
  horizon_years: number;
  risk_class: string;
  confidence: number;
  methodology: string;
  factor_contributions: Record<string, any>;
  evidence_summary: Record<string, any>;
  missing_inputs: string[];
  created_at: string;
}

export interface RelocationSite {
  id: string;
  code: string;
  name: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  total_capacity: number;
  current_occupancy: number;
  available_capacity: number;
  future_risk_score?: number | null;
  land_score?: number | null;
  water_score?: number | null;
  housing_score?: number | null;
  road_score?: number | null;
  power_score?: number | null;
  healthcare_score?: number | null;
  education_score?: number | null;
  environment_score?: number | null;
  verified: boolean;
}

export interface SOS {
  id: string;
  user_id?: string | null;
  caller_name?: string | null;
  phone?: string | null;
  latitude: number;
  longitude: number;
  hazard_type?: string | null;
  message?: string | null;
  transcript?: string | null;
  special_needs: string[];
  people_count: number;
  priority_score: number;
  status:
    | 'new'
    | 'active'
    | 'acknowledged'
    | 'assigned'
    | 'en_route'
    | 'contacted'
    | 'evacuating'
    | 'at_shelter'
    | 'resolved'
    | string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitizenReport {
  id: string;
  hazard_type: string;
  description: string;
  latitude: number;
  longitude: number;
  citizen_severity: string;
  people_affected?: number | null;
  road_blocked?: boolean | null;
  evidence_url?: string | null;
  status: string;
  verification_notes?: string | null;
  verified_by?: string | null;
  created_at: string;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: string;
  hazard_type?: string | null;
  status: string;
  source_type: string;
  published_at?: string | null;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  age_group: string;
  safety_status: string;
  location_sharing: boolean;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_checkin_at?: string | null;
}
