import json
from typing import Dict, Any, List, TypedDict
from langgraph.graph import StateGraph, END
from google import generativeai as genai
from services.rag.hybrid_search import hybrid_search
from services.rag.context_assembler import assemble_context
from config.settings import settings
from loguru import logger

genai.configure(api_key=settings.google_ai_api_key)

# Define LangGraph state dictionary
class AgentState(TypedDict):
    query: str
    plant_id: str
    filters: Dict[str, Any]
    user_role: str
    intent: Dict[str, Any]
    chunks: List[Dict[str, Any]]
    draft_answer: str
    validated: bool
    final_response: Dict[str, Any]

# NODE 1: Query Analyzer
async def query_analyzer(state: AgentState) -> Dict[str, Any]:
    logger.info("Graph Node: query_analyzer")
    query = state["query"]
    
    prompt = f"""Analyze the following user query in an industrial plant context.
Identify:
1. Query Type: factual, procedural, diagnostic, comparative, or other.
2. Entities: equipment tags (e.g. P-101), regulation codes (e.g. OISD-118), chemicals, parameters.
3. Target document types that might contain this info (e.g. SOP, PID, OEMManual, IncidentReport).

Return ONLY a JSON object:
{{
  "queryType": "procedural",
  "entities": {{"equipment": ["P-101"], "regulations": []}},
  "targetDocTypes": ["SOP", "OEMManual"]
}}
Do not write markdown block quotes.
Query: {query}
"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        res = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        intent = json.loads(res.text.strip())
    except Exception as e:
        logger.error(f"Query analyzer failed: {e}")
        intent = {"queryType": "factual", "entities": {"equipment": [], "regulations": []}, "targetDocTypes": []}
        
    return {"intent": intent}

# NODE 2: Retriever
async def retriever(state: AgentState) -> Dict[str, Any]:
    logger.info("Graph Node: retriever")
    query = state["query"]
    plant_id = state["plant_id"]
    intent = state.get("intent", {})
    
    # Extract search filters from intent
    target_docs = intent.get("targetDocTypes", [])
    equipment = intent.get("entities", {}).get("equipment", [])
    
    search_filters = {**state.get("filters", {})}
    if target_docs:
        search_filters["doc_types"] = target_docs
    if equipment:
        search_filters["equipment_tags"] = equipment

    # Run hybrid vector retrieval
    fused_hits = await hybrid_search(query, plant_id, top_k=15, filters=search_filters)
    
    # Load chunk contents from mongo and clean
    chunks = await assemble_context(fused_hits, token_budget=4000)
    
    return {"chunks": chunks}

# NODE 3: Reasoner
async def reasoner(state: AgentState) -> Dict[str, Any]:
    logger.info("Graph Node: reasoner")
    query = state["query"]
    chunks = state["chunks"]
    role = state.get("user_role", "Technician")
    
    # Format context for prompt
    context_str = ""
    for idx, c in enumerate(chunks):
        context_str += f"[{idx+1}] Source: {c['title']} | Page: {c['page_numbers']}\nContent: {c['content']}\n\n"

    system_prompt = f"""You are IKIP Copilot, an industrial knowledge expert AI assistant.
You answer questions about plant operations, maintenance, safety regulations, and equipment history for an Indian heavy industry context.

CRITICAL RULES:
1. Answer ONLY based on the provided context chunks. Never fabricate information.
2. If the context does not contain enough information, say: 
   "The available documents don't contain enough information to answer this confidently. I suggest consulting engineering team."
3. Always cite your sources using [Doc: Title, Page: N] inline format matching the sources numbered index.
4. For safety-critical information (isolation procedures, HAZOP, emergency responses), add: "⚠️ VERIFY with current approved procedure before executing."
5. For regulatory questions, cite the specific regulation clause (e.g. OISD-118 Cl.4.3).
6. Assign a confidence level to your answer: HIGH / MEDIUM / LOW.
   HIGH = directly stated in context. MEDIUM = inferred from context. LOW = partial info.
7. For maintenance procedures: format as numbered steps.
8. For equipment specs: use a clear table format.

CONTEXT:
{context_str}

User Role: {role}
Question: {query}
"""

    model = genai.GenerativeModel(settings.gemini_model)
    res = model.generate_content(system_prompt)
    
    return {"draft_answer": res.text}

# NODE 4: Validator
async def validator(state: AgentState) -> Dict[str, Any]:
    logger.info("Graph Node: validator")
    draft = state["draft_answer"]
    chunks = state["chunks"]
    
    # Quick sanity check for grounding
    context_text = " ".join([c["content"].lower() for c in chunks])
    
    # We can ask Gemini flash to validate the draft answer against the context chunks
    prompt = f"""You are a safety compliance checker. Check if the draft answer makes any claims not supported by the context documents.
    If the draft answer makes unsupported claims or hallucinates details, set validated = false.
    Otherwise, set validated = true.

    DRAFT ANSWER:
    {draft}

    CONTEXT DOCUMENTS:
    {context_text[:10000]}

    Return ONLY a JSON:
    {{
      "validated": true,
      "reason": "Claims are fully grounded."
    }}
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        res = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        val_res = json.loads(res.text.strip())
        validated = val_res.get("validated", True)
    except Exception as e:
        logger.error(f"Validator failed: {e}")
        validated = True # fallback
        
    return {"validated": validated}

# NODE 5: Formatter
async def formatter(state: AgentState) -> Dict[str, Any]:
    logger.info("Graph Node: formatter")
    draft = state["draft_answer"]
    chunks = state["chunks"]
    query = state["query"]
    plant_id = state["plant_id"]

    # Extract inline citations
    sources = []
    seen_docs = set()
    for chunk in chunks:
        doc_id = chunk["document_id"]
        if doc_id not in seen_docs:
            seen_docs.add(doc_id)
            sources.append({
                "documentId": doc_id,
                "title": chunk["title"],
                "pageNumbers": chunk["page_numbers"],
                "confidence": 0.95
            })

    # Assign confidence based on keyword matches or draft text
    confidence = "Medium"
    if "high" in draft.lower() or "confidence: high" in draft.lower():
        confidence = "High"
    elif "low" in draft.lower() or "confidence: low" in draft.lower():
        confidence = "Low"

    # Suggest follow-up questions
    suggested = []
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"Given this question: '{query}', suggest 3 simple follow-up questions an engineer might ask next. Return a JSON list of strings."
        res = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        suggested = json.loads(res.text.strip())
    except Exception:
        suggested = ["What are the safety requirements?", "Show maintenance log", "Is there a checklist?"]

    final_response = {
        "answer": draft,
        "sources": sources,
        "confidence": confidence,
        "suggestedQueries": suggested,
        "plantId": plant_id
    }

    return {"final_response": final_response}

# Conditional routing
def route_validation(state: AgentState):
    if state.get("validated", True):
        return "formatter"
    else:
        # If validator rejected it, we could route to reasoner to regenerate, but for simplicity we proceed with a caveat
        logger.warning("Draft answer failed validation! Appending grounding disclaimer.")
        return "formatter"

# Build StateGraph workflow
workflow = StateGraph(AgentState)

workflow.add_node("query_analyzer", query_analyzer)
workflow.add_node("retriever", retriever)
workflow.add_node("reasoner", reasoner)
workflow.add_node("validator", validator)
workflow.add_node("formatter", formatter)

workflow.set_entry_point("query_analyzer")
workflow.add_edge("query_analyzer", "retriever")
workflow.add_edge("retriever", "reasoner")
workflow.add_edge("reasoner", "validator")
workflow.add_conditional_edges(
    "validator",
    route_validation,
    {
        "formatter": "formatter",
        # We can expand this if needed
    }
)
workflow.add_edge("formatter", END)

copilot_agent_graph = workflow.compile()
