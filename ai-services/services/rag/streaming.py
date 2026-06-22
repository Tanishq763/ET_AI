import json
import asyncio
from typing import List, Dict, Any, AsyncGenerator
from google import generativeai as genai
from config.settings import settings
from loguru import logger

genai.configure(api_key=settings.google_ai_api_key)

async def stream_answer_tokens(query: str, chunks: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
    """Asynchronously generates and yields answer tokens in SSE format."""
    context_str = ""
    for idx, c in enumerate(chunks):
        context_str += f"[{idx+1}] Source: {c['title']} | Page: {c['page_numbers']}\nContent: {c['content']}\n\n"

    system_prompt = f"""You are IKIP Copilot, an industrial knowledge expert AI assistant.
You answer questions about plant operations, maintenance, safety regulations, and equipment history.
Respond based ONLY on the provided context. Cite sources using [Doc: Title, Page: N] inline format.

CONTEXT:
{context_str}

Question: {query}
"""

    try:
        model = genai.GenerativeModel(settings.gemini_model)
        # Use generate_content_stream for token-by-token streaming
        response_stream = model.generate_content_stream(system_prompt)
        
        for response_chunk in response_stream:
            # Yield token as JSON SSE format
            token = response_chunk.text
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"
                # Small sleep to prevent network congestion
                await asyncio.sleep(0.01)
                
    except Exception as e:
        logger.error(f"Error in token streaming generator: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
