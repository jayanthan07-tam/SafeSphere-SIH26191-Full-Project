# Architecture

```text
React + TypeScript
      |
      | HTTPS / JWT
      v
FastAPI API
  |       |        |        |
  |       |        |        +--> SMS / AI / Routing provider adapters
  |       |        +-----------> upload storage
  |       +--------------------> WebSocket SOS events
  +----------------------------> PostgreSQL / PostGIS
```

## Backend layers

- `api/routes`: HTTP and WebSocket transport
- `models`: persistent entities
- `schemas`: validated API contracts
- `services`: risk, relocation, cost, reports, notifications and context logic
- `providers`: external service adapters
- `core`: configuration, auth and RBAC
- `db`: engine/session/base

## Frontend layers

- `pages`: route-level application screens
- `components`: navigation, maps, forms, SOS and reusable UI
- `context`: authentication/session state
- `lib`: API client and utilities
- `types`: shared TypeScript contracts
