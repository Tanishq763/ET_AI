import json
from typing import List, Dict, Any
from google import generativeai as genai
from config.settings import settings
from loguru import logger

genai.configure(api_key=settings.google_ai_api_key)

async def extract_entities(chunk_text: str, doc_type: str) -> List[Dict[str, Any]]:
    """Calls Gemini to extract entities (EQUIPMENT, INSTRUMENT, CHEMICAL, etc.) from chunk text."""
    if not chunk_text.strip():
        return []

    prompt = f"""You are an industrial document parser. Extract ALL named entities from the following text chunk.
Return ONLY a JSON array. Do not wrap in markdown code blocks like ```json.
JSON Schema for each entity in the array:
{{
  "text": "exact text as it appears in the chunk",
  "normalizedText": "canonical form (e.g. 'P-101' not 'pump p101', 'OISD-118' not 'oisd standard 118')",
  "type": "one of [EQUIPMENT, INSTRUMENT, CHEMICAL, PERSON, REGULATION, PARAMETER, DATE, LOCATION, PROCEDURE, ORGANIZATION]",
  "confidence": 0.0-1.0,
  "context": "brief context sentence from the text"
}}

Entity Definitions:
- EQUIPMENT: Pumps, compressors, vessels, tanks, heat exchangers, motors, valves, piping. Examples: "Pump P-101", "Vessel V-305"
- INSTRUMENT: Measurement and control devices. Examples: "FT-201", "LIC-305", "pressure gauge PI-102"
- CHEMICAL: Process fluids, chemicals, hazardous materials. Examples: "Hydrogen Sulphide", "Crude oil", "H2S"
- REGULATION: Standards, codes, safety regulations. Examples: "OISD-118", "Factory Act 1948 Section 7", "PESO 2016"
- PARAMETER: Numerical process values with units. Examples: "4.2 bar", "120°C", "750 RPM"
- PROCEDURE: Named SOPs, inspections or manuals. Examples: "SOP-MAINT-007", "vibration check sheet"
- LOCATION: Units, zones, or specific locations inside the plant.

Document Chunk:
{chunk_text}

Document Type: {doc_type}
"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Enforce JSON output response
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        res_text = response.text.strip()
        # Clean markdown wrappers if returned
        if res_text.startswith("```"):
            res_text = res_text.split("```")[1]
            if res_text.startswith("json"):
                res_text = res_text[4:]
            res_text = res_text.strip()

        entities = json.loads(res_text)
        if not isinstance(entities, list):
            logger.warning(f"Gemini did not return an array list: {res_text}")
            return []

        # Validate keys
        valid_entities = []
        valid_types = [
            "EQUIPMENT", "INSTRUMENT", "CHEMICAL", "PERSON", 
            "REGULATION", "PARAMETER", "DATE", "LOCATION", 
            "PROCEDURE", "ORGANIZATION"
        ]

        for ent in entities:
            if not isinstance(ent, dict):
                continue
            if "text" not in ent or "type" not in ent:
                continue
            
            ent_type = str(ent["type"]).upper()
            if ent_type not in valid_types:
                continue

            valid_entities.append({
                "text": ent["text"],
                "type": ent_type,
                "confidence": float(ent.get("confidence", 0.8)),
                "normalizedText": ent.get("normalizedText") or ent["text"],
                "normalizedId": ent.get("normalizedText") or ent["text"],
                "context": ent.get("context", "")
            })

        logger.info(f"Extracted {len(valid_entities)} entities from chunk")
        return valid_entities

    except Exception as e:
        logger.error(f"Failed to extract entities: {e}")
        return []
