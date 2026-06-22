from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import settings

class MongoClientManager:
    _client: AsyncIOMotorClient = None

    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        if cls._client is None:
            cls._client = AsyncIOMotorClient(settings.mongodb_uri)
        return cls._client

    @classmethod
    def get_db(cls):
        client = cls.get_client()
        return client[settings.mongodb_db_name]

    @classmethod
    def close(cls):
        if cls._client is not None:
            cls._client.close()
            cls._client = None
