import json
from typing import List, Dict, Any
from google import generativeai as genai
from services.rag.hybrid_search import hybrid_search
from services.rag.context_assembler import assemble_context
from config.settings import settings
from loguru import logger

genai.configure(api_key=settings.google_ai_api_key)

async def assess_compliance_clause(
    clause_text: str, 
    clause_code: str, 
    plant_id: str, 
    doc_types: List[str] = None
) -> Dict[str, Any]:
    """Runs a RAG assessment of a regulation clause against plant SOPs/Procedures and flags compliance gaps."""
    if not doc_types:
        doc_types = ["SOP", "Procedure", "InspectionReport"]

    # 1. Search RAG for documents covering this regulation clause
    logger.info(f"Compliance Agent: Searching evidence for clause {clause_code}...")
    fused_hits = await hybrid_search(
        clause_text,
        plant_id,
        top_k=10,
        filters={"doc_types": doc_types}
    )

    chunks = await assemble_context(fused_hits, token_budget=4000)
    
    # Format evidence context
    evidence_str = ""
    for idx, c in enumerate(chunks):
        evidence_str += f"[{idx+1}] Source Document: {c['title']} | Page: {c['page_numbers']}\nContent: {c['content']}\n\n"

    if not chunks:
        # No evidence found in corpus
        return {
            "complianceStatus": "NonCompliant",
            "severity": "High",
            "evidenceChunks": [],
            "evidenceSummary": "No supporting SOPs or plant documents were found in the document library referencing this regulatory requirement.",
            "gapDescription": "Missing documented procedures or operating manuals mapping to this regulation.",
            "correctiveAction": "Create a new Standard Operating Procedure (SOP) addressing the safety guidelines in this clause.",
            "confidence": 0.9,
            "evidenceStrength": "None"
        }

    # 2. Assess compliance using Gemini
    prompt = f"""You are an industrial regulatory compliance expert for India.
Assess whether the provided evidence from plant procedures MEETS the stated regulatory requirement.

REGULATORY REQUIREMENT:
Clause Code: {clause_code}
Clause Text: {clause_text}

EVIDENCE RETRIEVED FROM PLANT DOCUMENTS:
{evidence_str}

Respond in this exact JSON format. Do not wrap in markdown quotes.
{{
  "complianceStatus": "one of [Compliant, PartiallyCompliant, NonCompliant, InsufficientEvidence]",
  "severity": "one of [Critical, High, Medium, Low, null]",  // if NonCompliant or PartiallyCompliant
  "evidenceSummary": "what evidence was found and how it relates to the requirement",
  "gapDescription": "specific gap between requirement and current evidence (null if Compliant)",
  "correctiveAction": "specific action needed to achieve compliance (null if Compliant)",
  "confidence": 0.0-1.0,
  "evidenceStrength": "one of [Strong, Moderate, Weak, None]"
}}

Be conservative: if evidence is ambiguous, lean toward PartiallyCompliant rather than Compliant.
"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        
        assessment = json.loads(response.text.strip())
        
        # Append supporting chunk point IDs
        assessment["evidenceChunks"] = [c["chunk_id"] for c in chunks]
        logger.info(f"Compliance mapping completed for {clause_code}: Status is {assessment.get('complianceStatus')}")
        return assessment
        
    except Exception as e:
        logger.error(f"Compliance clause assessment failed: {e}")
        return {
            "complianceStatus": "NotAssessed",
            "severity": "Low",
            "evidenceChunks": [],
            "evidenceSummary": "Error executing AI assessment",
            "gapDescription": str(e),
            "correctiveAction": "Trigger rescan manually",
            "confidence": 0.5,
            "evidenceStrength": "None"
        }
