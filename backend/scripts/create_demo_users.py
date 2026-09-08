import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.seed_service import seed_demo_users

if __name__ == "__main__":
    print("Seeding demo users for SafeSphere...")
    seed_demo_users()
    print("All demo users are ready.")
