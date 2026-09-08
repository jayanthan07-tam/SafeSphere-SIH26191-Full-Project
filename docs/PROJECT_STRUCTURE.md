# Project structure

```text
disaster-management-production/
├── .env.example
├── docker-compose.yml
├── START_PROJECT.bat
├── STOP_PROJECT.bat
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── scripts/
│   ├── tests/
│   └── app/
│       ├── api/routes/
│       ├── core/
│       ├── db/
│       ├── models/
│       ├── schemas/
│       ├── services/
│       └── providers/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── components/
│       ├── context/
│       ├── lib/
│       ├── pages/
│       ├── styles/
│       └── types/
├── storage/uploads/
└── docs/
```

The backend is organized by transport, domain service, persistence and external provider boundaries. The frontend uses route-level pages with shared navigation, auth, maps, emergency controls and API client.
