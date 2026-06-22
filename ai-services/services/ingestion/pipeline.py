import os
import tempfile
import uuid
import shutil
from bson.objectid import ObjectId
from google import generativeai as genai
from config.settings import settings
from db.mongo_client import MongoClientManager
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from services.ingestion.ocr import pdf_to_images, ocr_pages, detect_structure
from services.ingestion.chunker import get_chunks_from_text
from services.ingestion.embedder import embed_and_upsert_chunks
from services.ingestion.entity_extractor import extract_entities
from services.kg_agent.kg_builder import create_document_node, build_kg_relationships
from loguru import logger

# Active job tracking for status polling
jobs_status = {}

async def generate_document_summary(full_text: str) -> str:
    """Generates a concise 2-sentence summary of the document using Gemini."""
    if not full_text.strip():
        return "Empty document."
    try:
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = f"Provide a brief, exactly two-sentence summary of this industrial document for maintenance engineers:\n\n{full_text[:4000]}"
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Failed to generate summary: {e}")
        return "Summary generation failed."

async def run_ingestion_pipeline(job_id: str, gridfs_id: str, document_id: str, plant_id: str, doc_type: str):
    """Orchestrates the asynchronous stages of the ingestion pipeline."""
    jobs_status[job_id] = {"status": "processing", "progress": 10, "errors": None, "entityCount": 0, "kgNodesCreated": 0}
    temp_dir = tempfile.mkdtemp()
    temp_pdf_path = os.path.join(temp_dir, f"{document_id}.pdf")

    try:
        logger.info(f"🚀 Starting Ingestion Pipeline for doc {document_id} - Job {job_id}")
        
        # 1. Fetch file from GridFS
        db = MongoClientManager.get_db()
        fs = AsyncIOMotorGridFSBucket(db, bucket_name="documents")
        
        logger.info(f"Downloading file {gridfs_id} from GridFS...")
        grid_out = await fs.open_download_stream(ObjectId(gridfs_id))
        file_bytes = await grid_out.read()
        
        with open(temp_pdf_path, "wb") as f:
            f.write(file_bytes)
            
        jobs_status[job_id]["progress"] = 25

        # 2. Convert to Images
        images = pdf_to_images(temp_pdf_path)
        if not images:
            raise Error("Failed to render PDF pages to images")
            
        jobs_status[job_id]["progress"] = 35

        # 3. OCR Page content
        logger.info(f"Transcribing {len(images)} pages...")
        pages_text = await ocr_pages(temp_pdf_path, images, doc_type)
        
        # Concat full text for summarization
        full_document_text = "\n\n".join(pages_text)
        
        jobs_status[job_id]["progress"] = 50

        # 4. Chunk & Entity Extraction
        all_chunks = []
        all_extracted_entities = []
        
        for idx, page_text in enumerate(pages_text):
            page_num = idx + 1
            # Retrieve semantic chunks
            page_chunks = get_chunks_from_text(page_text, document_id, plant_id, page_num)
            
            for chunk in page_chunks:
                # Extract entities via Gemini
                entities = await extract_entities(chunk["content"], doc_type)
                chunk["entities"] = entities
                all_extracted_entities.extend(entities)
                all_chunks.append(chunk)

        jobs_status[job_id]["progress"] = 70
        jobs_status[job_id]["entityCount"] = len(all_extracted_entities)

        # 5. Insert Chunks to MongoDB
        logger.info(f"Saving {len(all_chunks)} chunks to MongoDB...")
        if all_chunks:
            # Add ObjectId and insert
            for chunk in all_chunks:
                chunk["_id"] = str(ObjectId())
            await db.chunks.insert_many(all_chunks)

        # 6. Generate Dense + Sparse embeddings and index in Qdrant
        logger.info("Generating embeddings and upserting to Qdrant...")
        await embed_and_upsert_chunks(all_chunks, plant_id, doc_type)
        
        jobs_status[job_id]["progress"] = 85

        # 7. Build Neo4j Knowledge Graph Nodes and Relations
        logger.info("Writing nodes to Neo4j knowledge graph...")
        summary = await generate_document_summary(full_document_text)
        
        await create_document_node(document_id, doc_type, doc_type, plant_id, summary)
        kg_res = await build_kg_relationships(document_id, all_extracted_entities, plant_id)
        
        jobs_status[job_id]["kgNodesCreated"] = kg_res.get("nodesCreated", 0)
        jobs_status[job_id]["progress"] = 95

        # 8. Update main Document Metadata in Mongo
        equipment_tags = list(set([e["normalizedText"] for e in all_extracted_entities if e["type"] == "EQUIPMENT"]))
        regulation_codes = list(set([e["normalizedText"] for e in all_extracted_entities if e["type"] == "REGULATION"]))
        
        await db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "ingestionStatus": "completed",
                "ingestionCompletedAt": datetime_now(),
                "equipmentTagsFound": equipment_tags,
                "regulatoryReferences": regulation_codes,
                "kgNodeId": document_id,
                "summary": summary,
                "pageCount": len(images)
            }}
        )

        jobs_status[job_id]["progress"] = 100
        jobs_status[job_id]["status"] = "completed"
        logger.info(f"✅ Document Ingestion Pipeline succeeded for doc {document_id}")

    except Exception as e:
        logger.error(f"❌ Ingestion Pipeline failed for doc {document_id}: {e}")
        jobs_status[job_id]["status"] = "failed"
        jobs_status[job_id]["errors"] = str(e)
        
        # Write failure to MongoDB
        try:
            await db.documents.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": {
                    "ingestionStatus": "failed",
                    "ingestionError": str(e),
                    "ingestionCompletedAt": datetime_now()
                }}
            )
        except Exception as mongo_err:
            logger.error(f"Failed to update document error status: {mongo_err}")
            
    finally:
        # Cleanup temp files
        shutil.rmtree(temp_dir, ignore_errors=True)

def datetime_now():
    from datetime import datetime
    return datetime.utcnow()
