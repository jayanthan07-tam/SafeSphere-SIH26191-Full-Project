from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    admin = "admin"
    administrator = "administrator"
    authority = "authority"
    district_officer = "district_officer"
    field_officer = "field_officer"
    citizen = "citizen"
    family_member = "family_member"

    # Uppercase aliases
    ADMIN = "admin"
    ADMINISTRATOR = "administrator"
    AUTHORITY = "authority"
    DISTRICT_OFFICER = "district_officer"
    FIELD_OFFICER = "field_officer"
    CITIZEN = "citizen"
    FAMILY_MEMBER = "family_member"

    @classmethod
    def _missing_(cls, value: object) -> "UserRole | None":
        if isinstance(value, str):
            normalized = value.strip().lower().replace(" ", "_")
            aliases = {
                "admin": cls.admin,
                "administrator": cls.admin,
                "authority": cls.authority,
                "disaster_management_authority": cls.authority,
                "district_officer": cls.authority,
                "field_officer": cls.field_officer,
                "citizen": cls.citizen,
                "family_member": cls.family_member,
            }
            if normalized in aliases:
                return aliases[normalized]
        return None

    @classmethod
    def from_str(cls, val: str | None) -> "UserRole":
        if not val:
            return cls.citizen
        normalized = val.strip().lower().replace(" ", "_")
        aliases = {
            "admin": cls.admin,
            "administrator": cls.admin,
            "authority": cls.authority,
            "disaster_management_authority": cls.authority,
            "district_officer": cls.authority,
            "field_officer": cls.field_officer,
            "citizen": cls.citizen,
            "family_member": cls.family_member,
        }
        if normalized in aliases:
            return aliases[normalized]
        for member in cls:
            if member.value == normalized or member.name.lower() == normalized:
                return member
        raise ValueError(f"Invalid role: {val}")


class HazardType(str, enum.Enum):
    flood = "flood"
    landslide = "landslide"
    coastal_erosion = "coastal_erosion"
    cyclone = "cyclone"
    heavy_rainfall = "heavy_rainfall"
    fire = "fire"
    earthquake = "earthquake"
    medical_emergency = "medical_emergency"
    infrastructure = "infrastructure"
    waterlogging = "waterlogging"
    bridge_damage = "bridge_damage"
    multi_hazard = "multi_hazard"
    other = "other"

    @classmethod
    def _missing_(cls, value: object) -> "HazardType | None":
        if isinstance(value, str):
            normalized = value.strip().lower().replace(" ", "_").replace("-", "_")
            aliases = {
                "heavy_rain": cls.heavy_rainfall,
                "heavy_rainfall": cls.heavy_rainfall,
                "rain": cls.heavy_rainfall,
                "medical": cls.medical_emergency,
                "medical_emergency": cls.medical_emergency,
                "quake": cls.earthquake,
                "earthquake": cls.earthquake,
            }
            if normalized in aliases:
                return aliases[normalized]
            for member in cls:
                if member.value == normalized or member.name.lower() == normalized:
                    return member
        return None



class RiskClass(str, enum.Enum):
    safe = "safe"
    moderate = "moderate"
    high = "high"
    critical = "critical"


class WorkflowStatus(str, enum.Enum):
    new = "new"
    pending = "pending"
    under_review = "under_review"
    assigned = "assigned"
    verified = "verified"
    rejected = "rejected"
    active = "active"
    acknowledged = "acknowledged"
    en_route = "en_route"
    contacted = "contacted"
    evacuating = "evacuating"
    at_shelter = "at_shelter"
    resolved = "resolved"
    draft = "draft"
    reviewed = "reviewed"
    published = "published"

    # Uppercase aliases for SOS and workflow
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    ASSIGNED = "assigned"
    EN_ROUTE = "en_route"
    CONTACTED = "contacted"
    EVACUATING = "evacuating"
    AT_SHELTER = "at_shelter"
    RESOLVED = "resolved"


class AlertSeverity(str, enum.Enum):
    info = "info"
    advisory = "advisory"
    high = "high"
    critical = "critical"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.citizen, index=True)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    taluk: Mapped[str | None] = mapped_column(String(120), nullable=True)
    locality: Mapped[str | None] = mapped_column(String(160), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(16), default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    @property
    def mobile_number(self) -> str | None:
        return self.phone

    @mobile_number.setter
    def mobile_number(self, val: str | None) -> None:
        self.phone = val

    @property
    def phone_number(self) -> str | None:
        return self.phone

    @phone_number.setter
    def phone_number(self, val: str | None) -> None:
        self.phone = val

    @property
    def name(self) -> str:
        return self.full_name

    @name.setter
    def name(self, val: str) -> None:
        self.full_name = val


class Habitation(Base):
    __tablename__ = "habitations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    state: Mapped[str] = mapped_column(String(120), index=True)
    district: Mapped[str] = mapped_column(String(120), index=True)
    taluk: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    population: Mapped[int] = mapped_column(Integer, default=0)
    households: Mapped[int] = mapped_column(Integer, default=0)

    vulnerability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    infrastructure_resilience_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    drainage_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    elevation_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    slope_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    river_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    rainfall_trend_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    land_use_change_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    population_growth_rate_percent: Mapped[float | None] = mapped_column(Float, nullable=True)

    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class HazardObservation(Base):
    __tablename__ = "hazard_observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    habitation_id: Mapped[str] = mapped_column(ForeignKey("habitations.id", ondelete="CASCADE"), index=True)
    hazard_type: Mapped[HazardType] = mapped_column(Enum(HazardType), index=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    severity_score: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(64), default="field")
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    verified_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    habitation_id: Mapped[str] = mapped_column(ForeignKey("habitations.id", ondelete="CASCADE"), index=True)
    hazard_type: Mapped[HazardType] = mapped_column(Enum(HazardType), index=True)
    current_score: Mapped[float] = mapped_column(Float)
    future_score: Mapped[float] = mapped_column(Float)
    horizon_years: Mapped[int] = mapped_column(Integer)
    risk_class: Mapped[RiskClass] = mapped_column(Enum(RiskClass), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    methodology: Mapped[str] = mapped_column(String(255))
    factor_contributions: Mapped[dict] = mapped_column(JSON, default=dict)
    evidence_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    missing_inputs: Mapped[list] = mapped_column(JSON, default=list)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class HazardZone(Base):
    __tablename__ = "hazard_zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    hazard_type: Mapped[HazardType] = mapped_column(Enum(HazardType), index=True)
    horizon_years: Mapped[int] = mapped_column(Integer, default=0)
    geojson: Mapped[dict] = mapped_column(JSON)
    source_type: Mapped[str] = mapped_column(String(64), default="model")
    methodology: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class RelocationSite(Base):
    __tablename__ = "relocation_sites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    state: Mapped[str] = mapped_column(String(120))
    district: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    total_capacity: Mapped[int] = mapped_column(Integer)
    current_occupancy: Mapped[int] = mapped_column(Integer, default=0)
    future_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    land_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    water_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    housing_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    road_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    power_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    healthcare_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    education_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    environment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    @property
    def available_capacity(self) -> int:
        return max(0, self.total_capacity - self.current_occupancy)


class RelocationPlan(Base):
    __tablename__ = "relocation_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    habitation_id: Mapped[str] = mapped_column(ForeignKey("habitations.id", ondelete="CASCADE"), index=True)
    selected_site_id: Mapped[str] = mapped_column(ForeignKey("relocation_sites.id"), index=True)
    population_to_relocate: Mapped[int] = mapped_column(Integer)
    score: Mapped[float] = mapped_column(Float)
    status: Mapped[WorkflowStatus] = mapped_column(Enum(WorkflowStatus), default=WorkflowStatus.draft)
    rationale: Mapped[dict] = mapped_column(JSON, default=dict)
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    cost_assumptions: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class InfrastructureAsset(Base):
    __tablename__ = "infrastructure_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    asset_type: Mapped[str] = mapped_column(String(64), index=True)
    state: Mapped[str] = mapped_column(String(120))
    district: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    operational_status: Mapped[str] = mapped_column(String(64), default="unknown")
    capacity: Mapped[float | None] = mapped_column(Float, nullable=True)
    vulnerability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class EvacuationRoute(Base):
    __tablename__ = "evacuation_routes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_latitude: Mapped[float] = mapped_column(Float)
    source_longitude: Mapped[float] = mapped_column(Float)
    destination_latitude: Mapped[float] = mapped_column(Float)
    destination_longitude: Mapped[float] = mapped_column(Float)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    safety_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    path_geojson: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    provider: Mapped[str] = mapped_column(String(64), default="manual")
    status: Mapped[str] = mapped_column(String(64), default="draft")
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class SOSRequest(Base):
    __tablename__ = "sos_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    caller_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    hazard_type: Mapped[HazardType | None] = mapped_column(Enum(HazardType), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    special_needs: Mapped[list] = mapped_column(JSON, default=list)
    people_count: Mapped[int] = mapped_column(Integer, default=1)
    priority_score: Mapped[float] = mapped_column(Float, default=50)
    status: Mapped[WorkflowStatus] = mapped_column(Enum(WorkflowStatus), default=WorkflowStatus.active, index=True)
    assigned_to: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    relationship: Mapped[str] = mapped_column(String(64))
    phone: Mapped[str] = mapped_column(String(32))
    age_group: Mapped[str] = mapped_column(String(32), default="adult")
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    special_assistance: Mapped[list] = mapped_column(JSON, default=list)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    app_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    location_sharing: Mapped[bool] = mapped_column(Boolean, default=False)
    last_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    safety_status: Mapped[str] = mapped_column(String(32), default="unknown")
    last_checkin_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class FamilyGroup(Base):
    __tablename__ = "family_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="My Family")
    join_code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    owner_safety_status: Mapped[str] = mapped_column(String(32), default="unknown")
    owner_location_sharing: Mapped[bool] = mapped_column(Boolean, default=False)
    owner_last_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    owner_last_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    owner_last_checkin_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class FamilyGroupMembership(Base):
    __tablename__ = "family_group_memberships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(ForeignKey("family_groups.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    relationship: Mapped[str] = mapped_column(String(64), default="family")
    safety_status: Mapped[str] = mapped_column(String(32), default="unknown")
    location_sharing: Mapped[bool] = mapped_column(Boolean, default=False)
    sms_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    special_assistance: Mapped[list] = mapped_column(JSON, default=list)
    last_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_checkin_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Aliases requested by requirements
    @property
    def family_group_id(self) -> str:
        return self.group_id

    @family_group_id.setter
    def family_group_id(self, val: str) -> None:
        self.group_id = val

    @property
    def status(self) -> str:
        return self.safety_status

    @status.setter
    def status(self, val: str) -> None:
        self.safety_status = val

    @property
    def location_sharing_enabled(self) -> bool:
        return self.location_sharing

    @location_sharing_enabled.setter
    def location_sharing_enabled(self, val: bool) -> None:
        self.location_sharing = val

    @property
    def joined_at(self) -> datetime:
        return self.created_at


FamilyMembership = FamilyGroupMembership


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    relationship: Mapped[str] = mapped_column(String(64))
    phone_number: Mapped[str] = mapped_column(String(32))
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[str] = mapped_column(String(32), default="primary")  # primary / secondary
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    hazard_type: Mapped[HazardType] = mapped_column(Enum(HazardType), index=True)
    description: Mapped[str] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    citizen_severity: Mapped[str] = mapped_column(String(32), default="moderate")
    people_affected: Mapped[int | None] = mapped_column(Integer, nullable=True)
    road_blocked: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    evidence_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[WorkflowStatus] = mapped_column(Enum(WorkflowStatus), default=WorkflowStatus.pending, index=True)
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity), index=True)
    hazard_type: Mapped[HazardType | None] = mapped_column(Enum(HazardType), nullable=True)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    taluk: Mapped[str | None] = mapped_column(String(120), nullable=True)
    locality: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[WorkflowStatus] = mapped_column(Enum(WorkflowStatus), default=WorkflowStatus.draft, index=True)
    channels: Mapped[list] = mapped_column(JSON, default=lambda: ["app"])
    source_type: Mapped[str] = mapped_column(String(64), default="authority")
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id: Mapped[str | None] = mapped_column(ForeignKey("alerts.id"), nullable=True, index=True)
    recipient: Mapped[str] = mapped_column(String(255))
    channel: Mapped[str] = mapped_column(String(32))
    provider: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(64), default="pending")
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    habitation_id: Mapped[str | None] = mapped_column(ForeignKey("habitations.id"), nullable=True, index=True)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    results: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class SatelliteChange(Base):
    __tablename__ = "satellite_changes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    change_type: Mapped[str] = mapped_column(String(64))
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data_source: Mapped[str] = mapped_column(String(255))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    region_geojson: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[WorkflowStatus] = mapped_column(Enum(WorkflowStatus), default=WorkflowStatus.pending)
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_type: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(255))
    scope: Mapped[dict] = mapped_column(JSON, default=dict)
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[WorkflowStatus] = mapped_column(Enum(WorkflowStatus), default=WorkflowStatus.draft)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str] = mapped_column(String(120), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
