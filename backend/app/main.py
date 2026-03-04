from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, patients, ambulances, hospitals, incidents, admin, ws


def create_app() -> FastAPI:
    app = FastAPI(
        title="Jeevan-Setu API",
        description="Real-Time Emergency Coordination System",
        version="1.0.0",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth.router)
    app.include_router(patients.router)
    app.include_router(ambulances.router)
    app.include_router(hospitals.router)
    app.include_router(incidents.router)
    app.include_router(admin.router)
    app.include_router(ws.router)

    @app.get("/")
    async def root():
        return {
            "name": "Jeevan-Setu API",
            "version": "1.0.0",
            "status": "running",
        }

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
