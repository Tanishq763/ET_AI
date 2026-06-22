from typing import List, Dict, Any, Optional
from google import generativeai as genai
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny
from db.qdrant_client import get_async_qdrant_client
from services.ingestion.embedder import get_dense_embedding, generate_sparse_vector
from config.settings import settings
from loguru import logger

genai.configure(api_key=settings.google_ai_api_key)

def reciprocal_rank_fusion(
    dense_results: List[Any], 
    sparse_results: List[Any], 
    k: int = 60
) -> List[Dict[str, Any]]:
    """Merges dense and sparse search outputs using Reciprocal Rank Fusion (RRF)."""
    rrf_scores = {}
    points_map = {}

    # Helper to process search results
    def add_results(results):
        for rank, hit in enumerate(results):
            point_id = hit.id
            points_map[point_id] = hit
            
            # RRF formula: 1 / (k + rank)
            score = 1.0 / (k + rank + 1)
            rrf_scores[point_id] = rrf_scores.get(point_id, 0.0) + score

    add_results(dense_results)
    add_results(sparse_results)

    # Sort point IDs based on final RRF score
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

    fused_results = []
    for pid in sorted_ids:
        hit = points_map[pid]
        fused_results.append({
            "chunk_id": hit.payload.get("chunk_id") or hit.id,
            "document_id": hit.payload.get("document_id"),
            "plant_id": hit.payload.get("plant_id"),
            "doc_type": hit.payload.get("doc_type"),
            "page_numbers": hit.payload.get("page_numbers", []),
            "chunk_index": hit.payload.get("chunk_index", 0),
            "content_preview": hit.payload.get("content_preview", ""),
            "score": rrf_scores[pid]
        })

    return fused_results

async def hybrid_search(
    query: str, 
    plant_id: str, 
    top_k: int = 20, 
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Performs dense + sparse hybrid vector search over Qdrant."""
    try:
        # 1. Embed query for dense vector search
        dense_vector = get_dense_embedding(query)

        # 2. Hashed sparse vector representing query terms
        sparse_vector = generate_sparse_vector(query)

        # 3. Build payload filter scoped to plant tenant and optional overrides
        must_conditions = [
            FieldCondition(key="plant_id", match=MatchValue(value=plant_id))
        ]

        if filters:
            if filters.get("doc_types"):
                must_conditions.append(
                    FieldCondition(key="doc_type", match=MatchAny(any=filters["doc_types"]))
                )
            if filters.get("equipment_tags"):
                must_conditions.append(
                    FieldCondition(key="equipment_tags", match=MatchAny(any=filters["equipment_tags"]))
                )

        payload_filter = Filter(must=must_conditions)
        qdrant_client = get_async_qdrant_client()

        # 4. Dense Search
        dense_results = await qdrant_client.search(
            collection_name=settings.qdrant_collection_name,
            query_vector=("dense", dense_vector),
            query_filter=payload_filter,
            limit=top_k
        )

        # 5. Sparse (BM25) Search
        sparse_results = await qdrant_client.search(
            collection_name=settings.qdrant_collection_name,
            query_vector=("bm25", sparse_vector),
            query_filter=payload_filter,
            limit=top_k
        )

        # 6. RRF Fusion
        fused = reciprocal_rank_fusion(dense_results, sparse_results, k=60)
        logger.info(f"Hybrid search returned {len(fused)} items for query: '{query}'")
        return fused

    except Exception as e:
        logger.error(f"Hybrid search failed: {e}")
        return []
