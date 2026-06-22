import json
from typing import Dict, Any, List
from google import generativeai as genai
from db.mongo_client import MongoClientManager
from db.neo4j_client import get_neo4j_driver
from config.settings import settings
from loguru import logger
from bson.objectid import ObjectId

genai.configure(api_key=settings.google_ai_api_key)

async def gather_rca_context(equipment_tag: str, plant_id: str) -> Dict[str, Any]:
    """Gathers recent work orders, inspection logs, and OEM manual chunks for equipment context."""
    db = MongoClientManager.get_db()
    
    # 1. Fetch equipment metadata
    eq = await db.equipment.find_one({"tag": equipment_tag, "plant": ObjectId(plant_id)})
    if not eq:
        return {"equipment": None, "history": "", "oem": ""}
        
    eq_id = eq["_id"]

    # 2. Fetch last 5 corrective work orders
    wos_cursor = db.workorders.find({
        "equipment": eq_id,
        "woType": "Corrective"
    }).sort("reportedAt", -1).limit(5)
    
    history_logs = []
    async for wo in wos_cursor:
        history_logs.append(
            f"WO: {wo.get('woNumber')} | Title: {wo.get('title')} | Root Cause: {wo.get('rootCause')}"
        )
        
    # 3. Fetch recent inspections
    inc_cursor = db.incidents.find({
        "equipmentInvolved": eq_id
    }).sort("occurredAt", -1).limit(3)
    
    inc_logs = []
    async for inc in inc_cursor:
        inc_logs.append(
            f"Incident: {inc.get('incidentNumber')} | Description: {inc.get('description')}"
        )

    return {
        "equipment": eq,
        "history": "\n".join(history_logs) or "No prior corrective maintenance history.",
        "inspections": "\n".join(inc_logs) or "No recent logged incident events."
    }

async def run_rca_agent(work_order_id: str, equipment_tag: str, plant_id: str) -> Dict[str, Any]:
    """Orchestrates the 5-Whys root cause analysis for a completed corrective maintenance ticket."""
    db = MongoClientManager.get_db()
    
    # Load primary WO ticket
    wo = await db.workorders.find_one({"_id": ObjectId(work_order_id)})
    if not wo:
        logger.error(f"Work order {work_order_id} not found for RCA")
        return {"rootCause": "Work order not found"}

    # Gather background context
    context = await gather_rca_context(equipment_tag, plant_id)
    eq = context["equipment"]

    eq_class = eq.get("equipmentClass", "Other") if eq else "Other"
    location = eq.get("location", "Unknown Unit") if eq else "Unknown Unit"
    criticality = eq.get("criticality", "Medium") if eq else "Medium"
    mtbf = eq.get("mtbf", 0) if eq else 0

    prompt = f"""You are a root cause analysis expert for industrial maintenance in India.
Perform a structured RCA using the 5-Whys methodology.

EQUIPMENT CONTEXT:
Tag: {equipment_tag}
Class: {eq_class}
Location: {location}
Criticality: {criticality}
MTBF: {mtbf} hours

FAILURE EVENT (Work Order):
Title: {wo.get('title')}
Description: {wo.get('problemDescription') or wo.get('title')}
Failure Code: {wo.get('failureCode') or 'N/A'}
Downtime: {wo.get('downtimeHours', 0)} hours

HISTORICAL CONTEXT (last 5 similar work orders on this equipment):
{context['history']}

INSPECTION FINDINGS (last 3 incidents):
{context['inspections']}

Respond in this exact JSON format. Do not wrap in markdown quotes.
{{
  "immediateFailureMode": "concise description of how it failed",
  "rootCause": {{
    "why1": "immediate physical cause",
    "why2": "second why (source of physical cause)",
    "why3": "third why",
    "why4": "fourth why",
    "why5": "systemic, organizational or basic root cause"
  }},
  "contributingFactors": ["factor1", "factor2"],
  "failureMechanismCategory": "one of [Mechanical, Electrical, Process, Human, Design, Material]",
  "preventiveRecommendations": [
    {{"action": "specific preventive maintenance step", "type": "Immediate|ShortTerm|LongTerm", "priority": "High|Medium|Low"}}
  ],
  "maintenanceScheduleRecommendation": "specific preventive scheduling changes",
  "confidence": 0.0-1.0,
  "dataQualityNote": "notes on context completeness"
}}
"""
    try:
        model = genai.GenerativeModel(settings.gemini_model)
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        rca_data = json.loads(response.text.strip())

        # Update Neo4j Knowledge Graph relationships
        driver = get_neo4j_driver()
        fm_code = rca_data.get("failureMechanismCategory", "Mechanical")
        fm_desc = rca_data.get("immediateFailureMode", "Failure")
        
        async with driver.session() as session:
            # Merge FailureMode and relate to WorkOrder
            cypher = """
            MERGE (fm:FailureMode {code: $fmCode})
            ON CREATE SET fm.description = $fmDesc, fm.mechanism = $fmCode
            MERGE (wo:WorkOrder {id: $woId})
            ON CREATE SET wo.woNumber = $woNum, wo.type = 'Corrective'
            MERGE (wo)-[rel:FAILED_AS {confidence: $confidence}]->(fm)
            """
            await session.run(cypher, {
                "fmCode": fm_code,
                "fmDesc": fm_desc,
                "woId": work_order_id,
                "woNum": wo.get("woNumber", "WO-TEMP"),
                "confidence": float(rca_data.get("confidence", 0.8))
            })
            logger.info(f"RCA completed. Logged FailureMode relationship in Neo4j for {equipment_tag}")

        return rca_data
    except Exception as e:
        logger.error(f"RCA analysis agent failed: {e}")
        return {
            "immediateFailureMode": "Unscheduled Downtime",
            "rootCause": {"why1": "Equipment failed", "why2": "Unknown", "why3": "Unknown", "why4": "Unknown", "why5": "Unknown"},
            "contributingFactors": [],
            "failureMechanismCategory": "Mechanical",
            "preventiveRecommendations": [],
            "maintenanceScheduleRecommendation": "Inspect equipment",
            "confidence": 0.5,
            "dataQualityNote": "AI generation encountered errors"
        }
