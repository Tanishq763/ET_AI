from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/ikip_production"
    mongodb_db_name: str = "ikip_production"
    
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: str = "password"
    
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: Optional[str] = ""
    qdrant_collection_name: str = "ikip_chunks"
    
    google_ai_api_key: str
    gemini_model: str = "gemini-1.5-pro"
    gemini_embedding_model: str = "text-embedding-004"
    
    jwt_secret: str = "super_secret_session_jwt_key_that_is_at_least_32_characters_long_12345"
    ai_services_api_key: str = "secret_ai_token_key_here"
    
    # Configure configuration source file
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
