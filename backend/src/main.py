import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the backend directory is in pythonpath if running directly (though module run is preferred)
# sys.path.append(str(Path(__file__).resolve().parent.parent))

# Load .env from backend root (parent of src)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from .api import register_routes

API_PREFIX = os.getenv("API_PREFIX", "/api")
app = FastAPI(title="NASA Ice Backend", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


register_routes(app, prefix=API_PREFIX)

# CORS: allow local dev frontends by default
allowed_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_host_port() -> tuple[str, int]:
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port_str = os.getenv("BACKEND_PORT", "5001")
    try:
        port = int(port_str)
    except ValueError as exc:
        raise RuntimeError(f"Invalid BACKEND_PORT '{port_str}' – must be an integer.") from exc
    return host, port


if __name__ == "__main__":
    import uvicorn

    host, port = _get_host_port()
    # When running directly, we assume src is in path or we are inside src.
    # But uvicorn "src.main:app" string requires module path awareness.
    # If we run `python src/main.py`, `uvicorn.run("src.main:app"...)` might fail if `src` is not a package.
    # However, standard usage: cd backend && python -m src.main
    # Or cd backend && uvicorn src.main:app --reload
    uvicorn.run("src.main:app", host=host, port=port, reload=True)
