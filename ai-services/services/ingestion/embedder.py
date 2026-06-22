from typing import List, Dict, Any
import re
from google import generativeai as genai
from qdrant_client.models import PointStruct
from db.qdrant_client import get_async_qdrant_client
from config.settings import settings
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure Gemini
genai.configure(api_key=settings.google_ai_api_key)

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=10))
def get_dense_embedding(text: str) -> List[float]:
    """Retrieves dense embedding vector using Google text-embedding-004."""
    try:
        response = genai.embed_content(
            model=f"models/{settings.gemini_embedding_model}",
            content=text,
            task_type="retrieval_document",
        )
        return response['embedding']
    except Exception as e:
        logger.error(f"Error calling Gemini Embedding API: {e}")
        raise e

def generate_sparse_vector(text: str) -> Dict[str, Any]:
    """Generates a hashed sparse word frequency vector to act as a BM25 equivalent."""
    words = re.findall(r'\b\w+\b', text.lower())
    freq = {}
    for w in words:
        if len(w) > 1: # Skip single letters
            freq[w] = freq.get(w, 0) + 1
            
    indices = []
    values = []
    for w, count in freq.items():
        # Hash word to a 32-bit positive integer index for Qdrant sparse indexing
        idx = abs(hash(w)) % 16777216 # 2^24 bounds
        indices.append(idx)
        values.append(float(count))
        
    return {"indices": indices, "values": values}

async def embed_and_upsert_chunks(chunks: List[Dict[str, Any]], plant_id: str, doc_type: str) -> List[str]:
    """Generates dense + sparse vectors for chunks and upserts them to Qdrant."""
    if not chunks:
        return []

    points = []
    point_ids = []

    for chunk in chunks:
        chunk_id = chunk.get("_id") or str(chunk.get("chunkIndex"))
        content = chunk["content"]
        
        try:
            # 1. Dense vector
            dense_vector = get_dense_embedding(content)
            
            # 2. Sparse vector
            sparse_vector = generate_sparse_vector(content)
            
            # 3. Build payload metadata
            equipment_tags = [e["normalizedText"] or e["text"] for e in chunk["entities"] if e["type"] == "EQUIPMENT"]
            regulation_codes = [e["normalizedText"] or e["text"] for e in chunk["entities"] if e["type"] == "REGULATION"]
            entity_types = list(set(e["type"] for e in chunk["entities"]))
            
            payload = {
                "chunk_id": chunk_id,
                "document_id": chunk["documentId"],
                "plant_id": plant_id,
                "doc_type": doc_type,
                "page_numbers": chunk["pageNumbers"],
                "chunk_index": chunk["chunkIndex"],
                "entity_types": entity_types,
                "equipment_tags": equipment_tags,
                "regulation_codes": regulation_codes,
                "content_preview": content[:200]
            }

            # Qdrant requires UUID or integer ID. We use chunk_id as is if it's a UUID string, or hash it.
            import uuid
            try:
                point_id = str(uuid.UUID(chunk_id))
            except ValueError:
                # Fallback: create deterministic UUID from chunk_id string
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{chunk['documentId']}-{chunk['chunkIndex']}"))

            point = PointStruct(
                id=point_id,
                vector={
                    "dense": dense_vector,
                    "bm25": sparse_vector
                },
                payload=payload
            )
            points.append(point)
            point_ids.append(point_id)
            
            # Save the point ID back to the chunk dictionary for MongoDB sync
            chunk["qdrantPointId"] = point_id
            chunk["embeddingModel"] = settings.gemini_embedding_model

        except Exception as e:
            logger.error(f"Failed to process vectors for chunk {chunk_id}: {e}")

    if points:
        qdrant_client = get_async_qdrant_client()
        await qdrant_client.upsert(
            collection_name=settings.qdrant_collection_name,
            points=points
        )
        logger.info(f"Successfully upserted {len(points)} points to Qdrant collection '{settings.qdrant_collection_name}'")

    return point_ids
