"""
FastAPI routers for the NASA ice backend.

Use `register_routes(app, prefix)` to mount all routers in one place.
"""
from fastapi import FastAPI

from .ice_extent import router as ice_extent_router
from .route_prediction import router as route_prediction_router
from .chat import router as chat_router

__all__ = [
    "ice_extent_router",
    "route_prediction_router",
    "chat_router",
    "register_routes",
]


def register_routes(app: FastAPI, prefix: str = "/api") -> None:
    """Mount all API routers with the provided prefix."""
    app.include_router(ice_extent_router, prefix=prefix)
    app.include_router(chat_router, prefix=prefix)
    app.include_router(route_prediction_router, prefix=prefix)
