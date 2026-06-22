from typing import List, Dict, Any
from db.mongo_client import MongoClientManager
from bson.objectid import ObjectId
from loguru import logger

async def assemble_context(fused_hits: List[Dict[str, Any]], token_budget: int = 6000) -> List[Dict[str, Any]]:
    """Retrieves chunk content from MongoDB, dedups highly similar chunks, and packs context up to token limit."""
    if not fused_hits:
        return []

    # Get DB client
    db = MongoClientManager.get_db()

    # Load all chunk contents
    chunk_ids = [ObjectId(hit["chunk_id"]) for hit in fused_hits if ObjectId.is_valid(hit["chunk_id"])]
    
    # Query mongo
    chunks_cursor = db.chunks.find({"_id": {"$in": chunk_ids}})
    chunks_by_id = {}
    async for chunk in chunks_cursor:
        chunks_by_id[str(chunk["_id"])] = chunk

    # Query document titles to show in citations
    doc_ids = list(set([ObjectId(hit["document_id"]) for hit in fused_hits if ObjectId.is_valid(hit["document_id"])]))
    docs_cursor = db.documents.find({"_id": {"$in": doc_ids}}, {"title": 1})
    doc_titles = {}
    async for doc in docs_cursor:
        doc_titles[str(doc["_id"])] = doc.get("title", "Unknown Document")

    assembled = []
    current_tokens = 0
    seen_contents = set()

    for hit in fused_hits:
        cid = hit["chunk_id"]
        chunk_data = chunks_by_id.get(cid)
        if not chunk_data:
            continue

        content = chunk_data["content"]
        
        # Simple diversity check: skip if exact duplicate or highly similar substring
        content_hash = chunk_data.get("contentHash") or content[:50]
        if content_hash in seen_contents:
            continue
            
        # Token estimation
        words = content.split()
        est_tokens = int(len(words) * 1.3)

        if current_tokens + est_tokens > token_budget:
            break

        seen_contents.add(content_hash)
        current_tokens += est_tokens
        
        assembled.append({
            "chunk_id": cid,
            "document_id": hit["document_id"],
            "title": doc_titles.get(hit["document_id"], "Unknown Document"),
            "content": content,
            "page_numbers": chunk_data.get("pageNumbers", []),
            "chunk_index": chunk_data.get("chunkIndex", 0),
            "score": hit["score"]
        })

    # Sort assembled chunks by document_id and chunk_index to maintain reading order
    assembled.sort(key=lambda x: (x["document_id"], x["chunk_index"]))
    logger.info(f"Assembled {len(assembled)} chunks into context context (estimated {current_tokens} tokens)")
    return assembled
