from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.models.entities import AlertSeverity, HazardType, RiskClass, UserRole, WorkflowStatus


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut | None = None
    role: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8)
    phone: str | None = None
    mobile_number: str | None = None
    role: str = "citizen"


class StaffUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8)
    phone: str | None = None
    mobile_number: str | None = None
    role: str
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    locality: str | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool | None = None
    role: str | None = None
    full_name: str | None = None
    phone: str | None = None
    district: str | None = None


class UserPasswordReset(BaseModel):
    new_password: str = Field(min_length=8)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    phone: str | None = None
    role: UserRole = UserRole.citizen
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    locality: str | None = None


class UserOut(ORMModel):
    id: str
    email: EmailStr
    phone: str | None = None
    mobile_number: str | None = None
    phone_number: str | None = None
    full_name: str
    name: str | None = None
    role: UserRole
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    locality: str | None = None
    preferred_language: str = "en"
    is_active: bool = True
    is_verified: bool = True
    created_at: datetime
    updated_at: datetime | None = None


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    locality: str | None = None
    preferred_language: str | None = None


class HabitationCreate(BaseModel):
    code: str
    name: str
    state: str
    district: str
    taluk: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    population: int = Field(ge=0)
    households: int = Field(ge=0)
    vulnerability_score: float | None = Field(default=None, ge=0, le=100)
    infrastructure_resilience_score: float | None = Field(default=None, ge=0, le=100)
    drainage_score: float | None = Field(default=None, ge=0, le=100)
    elevation_m: float | None = None
    slope_deg: float | None = Field(default=None, ge=0)
    river_distance_km: float | None = Field(default=None, ge=0)
    rainfall_trend_percent: float | None = None
    land_use_change_percent: float | None = None
    population_growth_rate_percent: float | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    source_name: str | None = None
    source_url: str | None = None


class HabitationUpdate(BaseModel):
    name: str | None = None
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    population: int | None = Field(default=None, ge=0)
    households: int | None = Field(default=None, ge=0)
    vulnerability_score: float | None = Field(default=None, ge=0, le=100)
    infrastructure_resilience_score: float | None = Field(default=None, ge=0, le=100)
    drainage_score: float | None = Field(default=None, ge=0, le=100)
    elevation_m: float | None = None
    slope_deg: float | None = Field(default=None, ge=0)
    river_distance_km: float | None = Field(default=None, ge=0)
    rainfall_trend_percent: float | None = None
    land_use_change_percent: float | None = None
    population_growth_rate_percent: float | None = None
    metadata_json: dict[str, Any] | None = None
    source_name: str | None = None
    source_url: str | None = None


class HabitationOut(ORMModel):
    id: str
    code: str
    name: str
    state: str
    district: str
    taluk: str
    latitude: float
    longitude: float
    population: int
    households: int
    vulnerability_score: float | None
    infrastructure_resilience_score: float | None
    drainage_score: float | None
    elevation_m: float | None
    slope_deg: float | None
    river_distance_km: float | None
    rainfall_trend_percent: float | None
    land_use_change_percent: float | None
    population_growth_rate_percent: float | None
    metadata_json: dict[str, Any]
    source_name: str | None
    source_url: str | None
    last_verified_at: datetime | None


class HazardObservationCreate(BaseModel):
    habitation_id: str
    hazard_type: HazardType
    observed_at: datetime
    severity_score: float = Field(ge=0, le=100)
    description: str | None = None
    source_type: str = "field"
    source_name: str | None = None
    evidence_url: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class HazardObservationOut(ORMModel):
    id: str
    habitation_id: str
    hazard_type: HazardType
    observed_at: datetime
    severity_score: float
    description: str | None
    source_type: str
    source_name: str | None
    evidence_url: str | None
    verified: bool
    verified_by: str | None
    latitude: float | None
    longitude: float | None
    created_at: datetime


class RiskAssessmentRequest(BaseModel):
    hazard_type: HazardType
    horizon_years: int = Field(default=5, ge=1, le=30)


class RiskAssessmentOut(ORMModel):
    id: str
    habitation_id: str
    hazard_type: HazardType
    current_score: float
    future_score: float
    horizon_years: int
    risk_class: RiskClass
    confidence: float
    methodology: str
    factor_contributions: dict[str, Any]
    evidence_summary: dict[str, Any]
    missing_inputs: list[Any]
    created_at: datetime


class RelocationSiteCreate(BaseModel):
    code: str
    name: str
    state: str
    district: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    total_capacity: int = Field(ge=0)
    current_occupancy: int = Field(default=0, ge=0)
    future_risk_score: float | None = Field(default=None, ge=0, le=100)
    land_score: float | None = Field(default=None, ge=0, le=100)
    water_score: float | None = Field(default=None, ge=0, le=100)
    housing_score: float | None = Field(default=None, ge=0, le=100)
    road_score: float | None = Field(default=None, ge=0, le=100)
    power_score: float | None = Field(default=None, ge=0, le=100)
    healthcare_score: float | None = Field(default=None, ge=0, le=100)
    education_score: float | None = Field(default=None, ge=0, le=100)
    environment_score: float | None = Field(default=None, ge=0, le=100)
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    source_name: str | None = None
    verified: bool = False


class RelocationSiteOut(ORMModel):
    id: str
    code: str
    name: str
    state: str
    district: str
    latitude: float
    longitude: float
    total_capacity: int
    current_occupancy: int
    future_risk_score: float | None
    land_score: float | None
    water_score: float | None
    housing_score: float | None
    road_score: float | None
    power_score: float | None
    healthcare_score: float | None
    education_score: float | None
    environment_score: float | None
    metadata_json: dict[str, Any]
    source_name: str | None
    verified: bool
    available_capacity: int


class RelocationRecommendRequest(BaseModel):
    population_to_relocate: int = Field(gt=0)
    weights: dict[str, float] = Field(default_factory=dict)
    max_distance_km: float | None = Field(default=None, gt=0)


class RelocationCandidate(BaseModel):
    site_id: str
    site_name: str
    distance_km: float
    available_capacity: int
    capacity_sufficient: bool
    future_risk_score: float | None
    infrastructure_score: float | None
    overall_score: float
    rationale: dict[str, Any]


class RelocationPlanCreate(BaseModel):
    habitation_id: str
    selected_site_id: str
    population_to_relocate: int = Field(gt=0)
    score: float = Field(ge=0, le=100)
    rationale: dict[str, Any] = Field(default_factory=dict)


class RelocationPlanOut(ORMModel):
    id: str
    habitation_id: str
    selected_site_id: str
    population_to_relocate: int
    score: float
    status: WorkflowStatus
    rationale: dict[str, Any]
    estimated_cost: float | None
    cost_assumptions: dict[str, Any]
    created_at: datetime


class CostEstimateRequest(BaseModel):
    households: int = Field(ge=0)
    population: int = Field(ge=0)
    assumptions: dict[str, float]
    contingency_percent: float = Field(default=10, ge=0, le=100)


class CostEstimateOut(BaseModel):
    subtotals: dict[str, float]
    subtotal: float
    contingency: float
    total: float
    per_household: float | None
    per_person: float | None
    assumptions: dict[str, float]


class InactionEstimateRequest(BaseModel):
    relocation_cost: float = Field(ge=0)
    loss_assumptions: dict[str, float]


class InactionEstimateOut(BaseModel):
    potential_loss: float
    potential_avoided_loss: float
    benefit_cost_ratio: float | None
    breakdown: dict[str, float]


class InfrastructureCreate(BaseModel):
    code: str
    name: str
    asset_type: str
    state: str
    district: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    operational_status: str = "unknown"
    capacity: float | None = None
    vulnerability_score: float | None = Field(default=None, ge=0, le=100)
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    verified: bool = False


class InfrastructureOut(ORMModel):
    id: str
    code: str
    name: str
    asset_type: str
    state: str
    district: str
    latitude: float
    longitude: float
    operational_status: str
    capacity: float | None
    vulnerability_score: float | None
    metadata_json: dict[str, Any]
    verified: bool


class RouteRequest(BaseModel):
    source_latitude: float
    source_longitude: float
    destination_latitude: float
    destination_longitude: float
    source_name: str | None = None
    destination_name: str | None = None


class RouteOut(BaseModel):
    provider: str
    distance_km: float
    duration_minutes: float
    geometry: dict[str, Any]
    warning: str | None = None


class SOSCreate(BaseModel):
    caller_name: str | None = None
    phone: str | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    hazard_type: HazardType | None = None
    message: str | None = None
    transcript: str | None = None
    special_needs: list[str] = Field(default_factory=list)
    people_count: int = Field(default=1, ge=1)


class PublicSOSCreate(BaseModel):
    caller_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=8, max_length=32)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    hazard_type: HazardType | None = None
    message: str | None = None
    transcript: str | None = None
    special_needs: list[str] = Field(default_factory=list)
    people_count: int = Field(default=1, ge=1, le=1000)


class SOSAssign(BaseModel):
    assigned_to: str


class SOSStatusUpdate(BaseModel):
    status: WorkflowStatus


class SOSOut(ORMModel):
    id: str
    user_id: str | None
    caller_name: str | None
    phone: str | None
    latitude: float
    longitude: float
    hazard_type: HazardType | None
    message: str | None
    transcript: str | None
    special_needs: list[Any]
    people_count: int
    priority_score: float
    status: WorkflowStatus
    assigned_to: str | None
    created_at: datetime
    updated_at: datetime


class FamilyMemberCreate(BaseModel):
    name: str
    relationship: str
    phone: str
    age_group: str = "adult"
    address: str | None = None
    special_assistance: list[str] = Field(default_factory=list)
    sms_enabled: bool = True
    app_alerts_enabled: bool = True
    location_sharing: bool = False


class FamilyCheckIn(BaseModel):
    status: str | None = None
    safety_status: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class FamilyMemberOut(ORMModel):
    id: str
    user_id: str
    name: str
    relationship: str
    phone: str
    age_group: str
    address: str | None = None
    special_assistance: list[Any]
    sms_enabled: bool
    app_alerts_enabled: bool
    location_sharing: bool
    last_latitude: float | None
    last_longitude: float | None
    safety_status: str
    last_checkin_at: datetime | None


class EmergencyContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    relationship: str = Field(min_length=2, max_length=64)
    phone_number: str = Field(min_length=8, max_length=32)
    sms_enabled: bool = True
    priority: str = "primary"  # primary | secondary


class EmergencyContactUpdate(BaseModel):
    name: str | None = None
    relationship: str | None = None
    phone_number: str | None = None
    sms_enabled: bool | None = None
    priority: str | None = None


class EmergencyContactOut(ORMModel):
    id: str
    user_id: str
    name: str
    relationship: str
    phone_number: str
    sms_enabled: bool
    priority: str
    created_at: datetime


class FamilyGroupJoin(BaseModel):
    join_code: str = Field(min_length=4, max_length=24)
    relationship: str = Field(default="Family Member", min_length=2, max_length=64)


class FamilyGroupCheckIn(BaseModel):
    status: str | None = None
    safety_status: str | None = None
    location_sharing: bool | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class FamilyGroupMemberOut(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    relationship: str
    safety_status: str
    status: str | None = None
    location_sharing: bool
    location_sharing_enabled: bool | None = None
    special_assistance: list[Any] = Field(default_factory=list)
    sms_alerts_enabled: bool = True
    last_latitude: float | None = None
    last_longitude: float | None = None
    last_checkin_at: datetime | None = None
    is_owner: bool = False


class FamilyGroupOut(BaseModel):
    id: str
    name: str
    join_code: str | None = None
    owner_user_id: str
    members: list[FamilyGroupMemberOut] = Field(default_factory=list)


class FamilyRegenerateCodeResponse(BaseModel):
    join_code: str
    message: str = "Family join code regenerated successfully."


class CitizenReportCreate(BaseModel):
    hazard_type: HazardType
    description: str = Field(min_length=5)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    citizen_severity: str = "moderate"
    people_affected: int | None = Field(default=None, ge=0)
    road_blocked: bool | None = None
    evidence_url: str | None = None


class CitizenReportVerify(BaseModel):
    status: Literal["verified", "rejected", "under_review"]
    verification_notes: str | None = None


class CitizenReportOut(ORMModel):
    id: str
    user_id: str | None
    hazard_type: HazardType
    description: str
    latitude: float
    longitude: float
    citizen_severity: str
    people_affected: int | None
    road_blocked: bool | None
    evidence_url: str | None
    status: WorkflowStatus
    verification_notes: str | None
    verified_by: str | None
    created_at: datetime


class AlertCreate(BaseModel):
    title: str
    message: str
    severity: AlertSeverity
    hazard_type: HazardType | None = None
    state: str | None = None
    district: str | None = None
    taluk: str | None = None
    locality: str | None = None
    channels: list[Literal["app", "sms"]] = Field(default_factory=lambda: ["app"])
    source_type: str = "authority"


class AlertOut(ORMModel):
    id: str
    title: str
    message: str
    severity: AlertSeverity
    hazard_type: HazardType | None
    state: str | None
    district: str | None
    taluk: str | None
    locality: str | None
    status: WorkflowStatus
    channels: list[Any]
    source_type: str
    published_at: datetime | None
    created_at: datetime


class ScenarioCreate(BaseModel):
    name: str
    habitation_id: str | None = None
    parameters: dict[str, float]


class ScenarioOut(ORMModel):
    id: str
    name: str
    habitation_id: str | None
    parameters: dict[str, Any]
    results: dict[str, Any]
    created_at: datetime


class SatelliteChangeCreate(BaseModel):
    name: str
    change_type: str
    start_date: datetime
    end_date: datetime
    data_source: str
    source_url: str | None = None
    region_geojson: dict[str, Any] | None = None
    metrics: dict[str, Any] = Field(default_factory=dict)


class SatelliteChangeOut(ORMModel):
    id: str
    name: str
    change_type: str
    start_date: datetime
    end_date: datetime
    data_source: str
    source_url: str | None
    region_geojson: dict[str, Any] | None
    metrics: dict[str, Any]
    status: WorkflowStatus
    verification_notes: str | None
    created_at: datetime


class AIQuery(BaseModel):
    question: str = Field(min_length=3, max_length=4000)
    habitation_id: str | None = None
    district: str | None = None


class AIAnswer(BaseModel):
    answer: str
    context_summary: dict[str, Any]
    provider: str


class ReportCreate(BaseModel):
    report_type: str
    title: str
    scope: dict[str, Any] = Field(default_factory=dict)
    content: dict[str, Any] = Field(default_factory=dict)


class ReportOut(ORMModel):
    id: str
    report_type: str
    title: str
    scope: dict[str, Any]
    content: dict[str, Any]
    status: WorkflowStatus
    created_at: datetime
    reviewed_by: str | None
    reviewed_at: datetime | None


class DashboardSummary(BaseModel):
    habitations: int
    latest_high_or_critical: int
    active_sos: int
    pending_citizen_reports: int
    published_alerts: int
    relocation_sites: int
    verified_relocation_sites: int
