from fastapi import APIRouter
from app.api.routes import (
    alerts,
    assistant,
    auth,
    citizen_reports,
    costs,
    dashboard,
    emergency_contacts,
    family,
    habitations,
    hazards,
    infrastructure,
    relocation,
    reports,
    risk,
    satellite,
    scenarios,
    sos,
    users,
    weather,
    ws,
)

route_modules = [
    auth.router,
    users.router,
    dashboard.router,
    habitations.router,
    hazards.router,
    risk.router,
    relocation.router,
    infrastructure.router,
    costs.router,
    sos.router,
    family.router,
    emergency_contacts.router,
    citizen_reports.router,
    alerts.router,
    scenarios.router,
    satellite.router,
    assistant.router,
    reports.router,
    weather.router,
    ws.router,
]

api_v1_router = APIRouter(prefix="/api/v1")
for r in route_modules:
    api_v1_router.include_router(r)

api_router = APIRouter(prefix="/api")
for r in route_modules:
    api_router.include_router(r)
