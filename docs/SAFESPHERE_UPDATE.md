# SafeSphere UI + Future Prediction Update

This update applies the liquid-glass citizen experience requested for SIH26191 while preserving the existing authority, district, field and admin modules.

## Added / changed

- Rebuilt citizen home as a blue iOS-inspired liquid-glass dashboard.
- Added current weather panel using existing Open-Meteo backend integration.
- Added permission-based automatic GPS request on citizen dashboard.
- Added GPS marker to the GIS risk map.
- Added citizen-facing future planning-risk outlook (`GET /api/v1/risk/outlook`).
- Added future prediction cards for multiple hazards with current score, future score, confidence and trend.
- Kept the scientific boundary: this estimates risk for planning; it does not predict the exact date of a disaster.
- Reworked citizen SOS into one primary **SEND SOS** action with hazard selection and automatic GPS attachment.
- Added optional hands-free wake-phrase SOS while the dashboard page is open.
- Default voice recognition is English (India); Tamil remains available; English (US) was removed from the selector.
- Added GPS-aware hazard reporting and dashboard hazard shortcuts.
- Removed the evacuation/shelter quick action from the citizen home dashboard.
- Added offline-first service worker caching for previously visited application and selected risk/alert data requests.
- Added CAP v1.2 XML export for alerts (`GET /api/v1/alerts/{alert_id}/cap`).
- Replaced external Leaflet marker image dependency with CSS-based markers.

## Validation performed in the build environment

- Python backend modules compile successfully.
- TypeScript frontend passes `tsc --noEmit`.
- Full Vite bundling could not run in the build container because the uploaded project carried Windows-specific Rollup optional binaries. Running `npm install` on the target machine restores the platform-specific dependency and enables `npm run build`.
- Backend pytest collection in the build container was blocked by a missing system `bcrypt` package. The project requirements already include `passlib[bcrypt]`; run `pip install -r backend/requirements.txt` in a fresh environment before tests.

## Run

Recommended:

```bash
docker compose up --build
```

Or install local dependencies from the included `package.json` / `requirements.txt` and use the existing development commands.

## 2026-09-08 White + Light Blue Liquid Glass Pass

The citizen-facing experience now uses a bright white/ice-blue liquid-glass theme. Dashboard panels, controls, map frame, family rows, future-risk cards, and the floating navigation dock are translucent frosted surfaces. The SOS action remains intentionally red as the only dominant emergency color. No backend routes or risk/SOS algorithms were changed by this visual pass.
