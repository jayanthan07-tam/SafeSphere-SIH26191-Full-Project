.PHONY: up down logs backend-test frontend-build
up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

backend-test:
	cd backend && pytest -q

frontend-build:
	cd frontend && npm run build
