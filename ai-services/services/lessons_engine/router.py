from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.lessons_engine.pattern_analyzer import analyze_incident_pattern
from loguru import logger

router = APIRouter(prefix="/lessons", tags=["lessons"])

class EventRequest(BaseModel):
    eventId: str
    eventType: str
    description: str
    equipmentTags: Optional[List[str]] = []
    plantId: str

@router.post("/analyze-event")
async def analyze_event(payload: EventRequest):
    logger.info(f"Lessons Engine: Analyzing event {payload.eventId} ({payload.eventType})")
    try:
        result = await analyze_incident_pattern(
            payload.eventId,
            payload.eventType,
            payload.description,
            payload.equipmentTags or [],
            payload.plantId
        )
        return result
    except Exception as e:
        logger.error(f"Lessons engine failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))
