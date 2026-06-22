import os
from typing import List
from PIL import Image
import pdfplumber
from pdf2image import convert_from_path
import pytesseract
from google import generativeai as genai
from config.settings import settings
from loguru import logger

# Initialize Gemini GenAI client
genai.configure(api_key=settings.google_ai_api_key)

def pdf_to_images(pdf_path: str, dpi: int = 200) -> List[Image.Image]:
    """Converts a PDF file to a list of PIL Images."""
    try:
        logger.info(f"Converting PDF {pdf_path} to images...")
        return convert_from_path(pdf_path, dpi=dpi)
    except Exception as e:
        logger.error(f"Error converting PDF to images: {e}")
        return []

def extract_native_text(pdf_path: str) -> List[str]:
    """Extracts native text from a PDF if it exists."""
    pages_text = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                pages_text.append(text or "")
    except Exception as e:
        logger.error(f"Error extracting native PDF text: {e}")
    return pages_text

async def ocr_pages(pdf_path: str, images: List[Image.Image], doc_type: str = "Other") -> List[str]:
    """Runs a multi-stage OCR pipeline: Native -> Tesseract -> Gemini Vision (for P&ID/Drawings)."""
    # 1. Try native extraction first
    pages_text = extract_native_text(pdf_path)
    
    # Check if we got meaningful text (non-blank page count)
    has_text = any(len(text.strip()) > 50 for text in pages_text)
    if has_text and len(pages_text) == len(images):
        logger.info("Successfully extracted native text from PDF")
        return pages_text
    
    # 2. Scanned PDF fallback
    logger.info("Scanned document detected. Starting OCR fallback pipeline...")
    ocr_results = []
    
    for i, img in enumerate(images):
        page_num = i + 1
        page_text = ""
        
        # If it's a P&ID or layout drawing, send it to Gemini Vision for high-fidelity description
        if doc_type in ["PID", "ProjectFile"] or "drawing" in pdf_path.lower():
            logger.info(f"Running Gemini Vision OCR on page {page_num} (Drawing/PID)")
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                prompt = (
                    "Transcribe all text from this industrial drawing/P&ID. "
                    "Make sure to extract all equipment tags (like P-101, V-202, FT-301), "
                    "line labels, instrument loops, title blocks, and notes."
                )
                response = model.generate_content([prompt, img])
                page_text = response.text
            except Exception as e:
                logger.warning(f"Gemini Vision failed on page {page_num}: {e}. Falling back to Tesseract.")
        
        # Standard page: Try Tesseract first
        if not page_text:
            logger.info(f"Running Tesseract OCR on page {page_num}")
            try:
                page_text = pytesseract.image_to_string(img)
            except Exception as e:
                logger.error(f"Tesseract OCR failed on page {page_num}: {e}")
                
        ocr_results.append(page_text or "")
        
    return ocr_results

def detect_structure(pdf_path: str) -> dict:
    """Extracts tables from a PDF using pdfplumber."""
    tables = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                extracted_tables = page.extract_tables()
                for table in extracted_tables:
                    # Clean empty rows
                    cleaned = [row for row in table if any(cell is not None and str(cell).strip() != "" for cell in row)]
                    if cleaned:
                        tables.append({"page": i + 1, "data": cleaned})
    except Exception as e:
        logger.error(f"Failed to detect tables: {e}")
    return {"tables": tables}
