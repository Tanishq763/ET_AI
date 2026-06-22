from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.rca_agent.rca_graph import run_rca_agent
from loguru import logger

router = APIRouter(prefix="/rca", tags=["rca"])

class RCARequest(BaseModel):
    workOrderId: str
    equipmentTag: str
    plantId: str

@router.post("/analyze")
async def analyze_failure(payload: RCARequest):
    logger.info(f"Triggering RCA analysis on work order {payload.workOrderId} for equipment {payload.equipmentTag}")
    try:
        result = await run_rca_agent(payload.workOrderId, payload.equipmentTag, payload.plantId)
        return result
    except Exception as e:
        logger.error(f"RCA Agent Endpoint Failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))
