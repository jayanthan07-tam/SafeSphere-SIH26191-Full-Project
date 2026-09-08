# Deployment checklist

- Run PostgreSQL/PostGIS with backups and point-in-time recovery.
- Replace development database credentials.
- Use a long random `SECRET_KEY`.
- Place services behind HTTPS.
- Restrict CORS to production origins.
- Use object storage for evidence files.
- Configure provider credentials via a secret manager.
- Enable provider delivery callbacks for SMS status.
- Add centralized logs/metrics and uptime monitoring.
- Configure rate limits/WAF at the gateway.
- Perform threat modeling and privacy review for SOS/GPS data.
- Validate hazard models with domain experts before operational use.
