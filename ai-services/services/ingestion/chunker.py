import spacy
from typing import List, Dict, Any
from loguru import logger
import hashlib

# Load spacy model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    # Fallback to simple split if model not downloaded yet
    nlp = None

def get_chunks_from_text(
    text: str, 
    document_id: str, 
    plant_id: str,
    page_number: int,
    target_tokens: int = 512,
    overlap_tokens: int = 64
) -> List[Dict[str, Any]]:
    """Chunks text semantically using sentence boundaries."""
    if not text.strip():
        return []

    # Estimate tokens: 1 word ≈ 1.3 tokens
    sentences = []
    if nlp:
        doc = nlp(text)
        sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    else:
        sentences = [s.strip() for s in text.split(". ") if s.strip()]

    chunks = []
    current_chunk = []
    current_token_count = 0
    chunk_index = 0

    for sentence in sentences:
        words = sentence.split()
        sentence_token_est = int(len(words) * 1.3)
        
        if current_token_count + sentence_token_est > target_tokens and current_chunk:
            # Finalize current chunk
            content = " ".join(current_chunk)
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
            chunks.append({
                "documentId": document_id,
                "plant": plant_id,
                "content": content,
                "contentHash": content_hash,
                "pageNumbers": [page_number],
                "chunkIndex": chunk_index,
                "tokenCount": current_token_count,
                "chunkType": "text",
                "entities": []
            })
            chunk_index += 1
            
            # Keep overlap sentences
            overlap_words = 0
            overlap_sentences = []
            for s in reversed(current_chunk):
                s_words = len(s.split())
                s_tokens = int(s_words * 1.3)
                if overlap_words + s_tokens < overlap_tokens:
                    overlap_sentences.insert(0, s)
                    overlap_words += s_tokens
                else:
                    break
            
            current_chunk = overlap_sentences + [sentence]
            current_token_count = overlap_words + sentence_token_est
        else:
            current_chunk.append(sentence)
            current_token_count += sentence_token_est

    # Append remaining
    if current_chunk:
        content = " ".join(current_chunk)
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        chunks.append({
            "documentId": document_id,
            "plant": plant_id,
            "content": content,
            "contentHash": content_hash,
            "pageNumbers": [page_number],
            "chunkIndex": chunk_index,
            "tokenCount": current_token_count,
            "chunkType": "text",
            "entities": []
        })

    return chunks
