from __future__ import annotations

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import Habitation, RiskAssessment, RelocationSite, InfrastructureAsset, Alert


def build_context(db: Session, habitation_id: str | None, district: str | None) -> dict:
    context: dict = {"scope": {"habitation_id": habitation_id, "district": district}}
    if habitation_id:
        h = db.get(Habitation, habitation_id)
        if h:
            context["habitation"] = {
                "id": h.id, "name": h.name, "district": h.district, "population": h.population,
                "households": h.households, "coordinates": [h.latitude, h.longitude],
            }
            risks = db.scalars(select(RiskAssessment).where(RiskAssessment.habitation_id == h.id).order_by(RiskAssessment.created_at.desc()).limit(5)).all()
            context["recent_risk_assessments"] = [
                {"hazard": r.hazard_type.value, "current": r.current_score, "future": r.future_score, "confidence": r.confidence, "methodology": r.methodology}
                for r in risks
            ]
            district = district or h.district
    if district:
        sites = db.scalars(select(RelocationSite).where(RelocationSite.district == district).limit(20)).all()
        context["relocation_sites"] = [
            {"id": s.id, "name": s.name, "available_capacity": s.available_capacity, "future_risk_score": s.future_risk_score, "verified": s.verified}
            for s in sites
        ]
        infra = db.scalars(select(InfrastructureAsset).where(InfrastructureAsset.district == district).limit(30)).all()
        context["infrastructure"] = [
            {"name": x.name, "type": x.asset_type, "status": x.operational_status, "vulnerability": x.vulnerability_score, "verified": x.verified}
            for x in infra
        ]
        alerts = db.scalars(select(Alert).where(Alert.district == district).order_by(Alert.created_at.desc()).limit(10)).all()
        context["alerts"] = [{"title": a.title, "severity": a.severity.value, "status": a.status.value, "source_type": a.source_type} for a in alerts]
    return context


async def ask_ai(question: str, context: dict) -> tuple[str, str]:
    s = get_settings()
    if not s.ai_enabled:
        raise RuntimeError("AI assistant is disabled. Configure AI_ENABLED, AI_BASE_URL, AI_API_KEY and AI_MODEL.")
    if not (s.ai_api_key and s.ai_model):
        raise RuntimeError("AI assistant configuration is incomplete.")
    system = (
        "You are a disaster-management decision-support assistant. Answer only from the supplied platform context. "
        "Do not invent official data, live status, disaster certainty, relocation orders, or model accuracy. "
        "Say when evidence is insufficient. Treat model outputs as decision support and require authority/field review where appropriate."
    )
    payload = {
        "model": s.ai_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
        ],
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {s.ai_api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(f"{s.ai_base_url.rstrip('/')}/chat/completions", headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"], s.ai_model
