from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.rag.hybrid_search import hybrid_search
from services.rag.context_assembler import assemble_context
from services.rag.copilot_agent import copilot_agent_graph
from services.rag.streaming import stream_answer_tokens
from loguru import logger

router = APIRouter(prefix="/query", tags=["rag"])

class SearchRequest(BaseModel):
    query: str
    plantId: str
    topK: Optional[int] = 20
    filters: Optional[Dict[str, Any]] = None

class AnswerRequest(BaseModel):
    query: str
    chunks: List[Dict[str, Any]]
    conversationHistory: Optional[List[Dict[str, Any]]] = []

class StreamRequest(BaseModel):
    query: str
    chunks: List[Dict[str, Any]]

@router.post("/search")
async def execute_search(payload: SearchRequest):
    logger.info(f"RAG search query: '{payload.query}' for plant {payload.plantId}")
    fused_hits = await hybrid_search(
        payload.query, 
        payload.plantId, 
        top_k=payload.topK or 20, 
        filters=payload.filters
    )
    chunks = await assemble_context(fused_hits, token_budget=4000)
    return {"chunks": chunks, "scores": [hit["score"] for hit in fused_hits], "entities": []}

@router.post("/answer")
async def generate_answer(payload: AnswerRequest):
    logger.info(f"Answering query: '{payload.query}' with {len(payload.chunks)} context chunks")
    
    # Run the compiled LangGraph agent graph
    state_input = {
        "query": payload.query,
        "plant_id": "",
        "filters": {},
        "user_role": "Engineer",
        "chunks": payload.chunks,
        "draft_answer": "",
        "validated": False,
        "final_response": {}
    }
    
    try:
        # We start graph execution from the reasoner node since chunks are already fetched
        # To do this cleanly, we can run the whole graph but retriever will return the current state chunks
        result = await copilot_agent_graph.ainvoke(state_input)
        return result["final_response"]
    except Exception as e:
        logger.error(f"LangGraph execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stream")
async def stream_answer(payload: StreamRequest):
    logger.info(f"Token stream requested for query: '{payload.query}'")
    return StreamingResponse(
        stream_answer_tokens(payload.query, payload.chunks),
        media_type="text/event-stream"
    )
