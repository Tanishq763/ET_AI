from fastapi import FastAPI
from contextlib import asynccontextmanager
from config.settings import settings
from config.logging import setup_logging
from db.qdrant_client import init_qdrant_collection
from db.neo4j_client import get_neo4j_driver, init_neo4j_constraints, close_neo4j
from db.mongo_client import MongoClientManager
from loguru import logger

# Import API routers
from services.ingestion.router import router as ingestion_router
from services.rag.router import router as rag_router
from services.rca_agent.router import router as rca_router
from services.compliance_agent.router import router as compliance_router
from services.lessons_engine.router import router as lessons_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    setup_logging()
    logger.info("Starting up IKIP AI Microservices...")
    
    # 1. Initialize databases
    try:
        init_qdrant_collection()
        get_neo4j_driver()
        await init_neo4j_constraints()
        MongoClientManager.get_client()
        logger.info("All AI services database connections successfully validated")
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}")

    yield
    
    # --- Shutdown ---
    logger.info("Shutting down IKIP AI Microservices...")
    await close_neo4j()
    MongoClientManager.close()
    logger.info("AI services database connections clean closed")

app = FastAPI(
    title="IKIP AI Microservices",
    description="Python FastAPI backend serving OCR pipelines, hybrid search, and LangGraph agents",
    version="1.0.0",
    lifespan=lifespan
)

# Register routers
app.include_router(ingestion_router)
app.include_router(rag_router)
app.include_router(rca_router)
app.include_router(compliance_router)
app.include_router(lessons_router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}
