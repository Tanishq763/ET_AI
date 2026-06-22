from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
import uuid
from services.ingestion.pipeline import run_ingestion_pipeline, jobs_status
from services.ingestion.pid_parser import parse_pid_pipeline
from loguru import logger

router = APIRouter(prefix="/ingest", tags=["ingestion"])

class IngestRequest(BaseModel):
    gridfsId: str
    documentId: str
    plantId: str
    docType: str

@router.post("/document")
async def trigger_ingestion(payload: IngestRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    logger.info(f"Triggering ingestion pipeline for document {payload.documentId} - Assigned Job ID: {job_id}")
    
    # Run pipeline asynchronously in background thread
    background_tasks.add_task(
        run_ingestion_pipeline,
        job_id,
        payload.gridfsId,
        payload.documentId,
        payload.plantId,
        payload.docType
    )
    
    # Store initial state
    jobs_status[job_id] = {
        "status": "queued",
        "progress": 0,
        "errors": None,
        "entityCount": 0,
        "kgNodesCreated": 0
    }
    
    return {"jobId": job_id, "status": "queued"}

@router.get("/status/{job_id}")
async def get_ingestion_status(job_id: str):
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_status[job_id]

class PIDParseRequest(BaseModel):
    imageBase64: str
    documentId: str

@router.post("/pid/parse")
async def parse_pid(payload: PIDParseRequest):
    logger.info(f"RAG Ingestion: Triggering P&ID parse on doc {payload.documentId}")
    try:
        result = await parse_pid_pipeline(payload.imageBase64, payload.documentId)
        return result
    except Exception as e:
        logger.error(f"P&ID parse endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
