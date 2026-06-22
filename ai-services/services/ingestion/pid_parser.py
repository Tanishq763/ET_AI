import cv2
import numpy as np
import base64
import json
from io import BytesIO
from PIL import Image
from google import generativeai as genai
from config.settings import settings
from loguru import logger

genai.configure(api_key=settings.google_ai_api_key)

def preprocess_pid_image(image_bytes: bytes) -> np.ndarray:
    """Preprocesses a P&ID drawing using adaptive thresholding for better line contrast."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        logger.error("Failed to decode image bytes with OpenCV")
        return None
        
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    return thresh

async def parse_pid_with_gemini(image_pil: Image.Image) -> dict:
    """Uses Gemini Vision to detect and map symbols, instrument loops, and topological connections."""
    prompt = """You are an expert engineer. Analyze this Piping and Instrumentation Diagram (P&ID) drawing.
Detect all equipment (pumps, vessels, exchangers, compressors), instruments (flow transmitters, control loops, valves), and their connections.

Return ONLY a JSON object containing lists of equipment, instruments, and connections:
{
  "equipment": [
    {"tag": "P-101", "class": "Pump", "description": "Feed Pump", "location_box": [ymin, xmin, ymax, xmax]}
  ],
  "instruments": [
    {"tag": "FT-201", "type": "Flow Transmitter", "location_box": [ymin, xmin, ymax, xmax]}
  ],
  "connections": [
    {"from": "P-101", "to": "FT-201", "type": "piping"}
  ]
}
Make sure all coordinates in location_box are normalized between 0 and 1000.
Do not include markdown tags like ```json.
"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            [prompt, image_pil],
            generation_config={"response_mime_type": "application/json"}
        )
        res_text = response.text.strip()
        
        # Clean any markdown packaging
        if res_text.startswith("```"):
            res_text = res_text.split("```")[1]
            if res_text.startswith("json"):
                res_text = res_text[4:]
            res_text = res_text.strip()
            
        parsed = json.loads(res_text)
        return parsed
    except Exception as e:
        logger.error(f"Gemini P&ID analysis failure: {e}")
        # Return fallback empty structure
        return {"equipment": [], "instruments": [], "connections": []}

async def parse_pid_pipeline(image_base64: str, document_id: str) -> dict:
    """Coordinates the full P&ID drawing parsing pipeline."""
    try:
        # Decode base64 image
        header, encoded = image_base64.split(",", 1) if "," in image_base64 else ("", image_base64)
        image_bytes = base64.b64decode(encoded)
        image_pil = Image.open(BytesIO(image_bytes))
        
        # OpenCV pre-processing (can be saved or used for contour checking if needed)
        processed_img = preprocess_pid_image(image_bytes)
        if processed_img is not None:
            logger.info("P&ID drawing pre-processed with OpenCV adaptive thresholding")
            
        # Run Gemini Vision topology map
        result = await parse_pid_with_gemini(image_pil)
        logger.info(f"P&ID Drawing {document_id} parsed. Found {len(result.get('equipment', []))} equipment nodes, {len(result.get('instruments', []))} instruments.")
        return result
    except Exception as e:
        logger.error(f"P&ID Parser pipeline failed: {e}")
        return {"equipment": [], "instruments": [], "connections": []}
