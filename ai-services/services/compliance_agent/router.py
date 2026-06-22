from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from services.compliance_agent.gap_detector import assess_compliance_clause
from db.mongo_client import MongoClientManager
from bson.objectid import ObjectId
from loguru import logger
from datetime import datetime

router = APIRouter(prefix="/compliance", tags=["compliance"])

compliance_jobs = {}

class ClauseRequest(BaseModel):
    clauseText: str
    clauseCode: str
    plantId: str
    docTypes: Optional[List[str]] = None

class FullScanRequest(BaseModel):
    plantId: str
    regulations: Optional[List[str]] = None

@router.post("/assess-clause")
async def assess_clause(payload: ClauseRequest):
    logger.info(f"Assessing compliance for clause: {payload.clauseCode}")
    try:
        result = await assess_compliance_clause(
            payload.clauseText,
            payload.clauseCode,
            payload.plantId,
            payload.docTypes
        )
        return result
    except Exception as e:
        logger.error(f"Clause assessment endpoint failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_full_compliance_scan(job_id: str, plant_id: str, regulations: List[str]):
    """Background task to scan and map all compliance regulations for a plant."""
    compliance_jobs[job_id] = {"status": "processing", "gapCount": 0, "criticalGaps": 0}
    db = MongoClientManager.get_db()

    try:
        # Load all mappings matching regulation codes
        query = {"plant": ObjectId(plant_id)}
        if regulations:
            query["regulationCode"] = {"$in": regulations}

        mappings_cursor = db.compliancemappings.find(query)
        mappings = []
        async for m in mappings_cursor:
            mappings.append(m)

        logger.info(f"Compliance Scan: Loaded {len(mappings)} mappings to assess for plant {plant_id}")
        
        gap_count = 0
        critical_gaps = 0

        for m in mappings:
            m_id = m["_id"]
            clause_text = m["clauseText"]
            clause_code = m["regulationCode"]
            
            # Assess clause
            res = await assess_compliance_clause(clause_text, clause_code, plant_id)
            
            # Translate evidence document IDs to ObjectIds
            doc_ids = []
            if res.get("evidenceChunks"):
                # Find matching documents for these chunk IDs
                chunk_objs = [str(c) for c in res["evidenceChunks"]]
                async for chunk in db.chunks.find({"_id": {"$in": chunk_objs}}, {"documentId": 1}):
                    doc_ids.append(ObjectId(chunk["documentId"]))
            
            # Deduplicate doc_ids
            doc_ids = list(set(doc_ids))

            status = res.get("complianceStatus", "NotAssessed")
            severity = res.get("severity")
            
            if status in ["NonCompliant", "PartiallyCompliant"]:
                gap_count += 1
                if severity == "Critical":
                    critical_gaps += 1

            # Update Mongoose model in MongoDB
            await db.compliancemappings.update_one(
                {"_id": m_id},
                {"$set": {
                    "complianceStatus": status,
                    "gapDescription": res.get("gapDescription"),
                    "severity": severity,
                    "evidenceSummary": res.get("evidenceSummary"),
                    "evidenceDocumentIds": doc_ids,
                    "correctiveAction": res.get("correctiveAction"),
                    "responsiblePerson": "Plant Safety Officer",
                    "targetDate": None,
                    "lastAssessedAt": datetime.utcnow(),
                    "assessedBy": "AI",
                    "aiConfidence": res.get("confidence", 0.8)
                }}
            )

        compliance_jobs[job_id]["gapCount"] = gap_count
        compliance_jobs[job_id]["criticalGaps"] = critical_gaps
        compliance_jobs[job_id]["status"] = "completed"
        logger.info(f"✅ Compliance scan completed for job {job_id}")

    except Exception as e:
        logger.error(f"Compliance scan background job failed: {e}")
        compliance_jobs[job_id]["status"] = "failed"
        compliance_jobs[job_id]["errors"] = str(e)

@router.post("/full-scan")
async def trigger_full_scan(payload: FullScanRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    logger.info(f"Compliance Scan requested for plant {payload.plantId} - Assigned Job ID: {job_id}")
    
    reg_list = payload.regulations or ["OISD-118", "FactoryAct-1948-S7", "PESO-2016"]
    
    background_tasks.add_task(
        run_full_compliance_scan,
        job_id,
        payload.plantId,
        reg_list
    )
    
    compliance_jobs[job_id] = {"status": "queued", "gapCount": 0, "criticalGaps": 0}
    return {"jobId": job_id, "status": "queued"}

@router.get("/status/{job_id}")
async def get_scan_status(job_id: str):
    if job_id not in compliance_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return compliance_jobs[job_id]
