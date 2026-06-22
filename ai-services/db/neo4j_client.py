from neo4j import AsyncGraphDatabase, AsyncDriver
from config.settings import settings
from loguru import logger

_driver: AsyncDriver = None

def get_neo4j_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        try:
            _driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password)
            )
            logger.info("Neo4j Async Driver successfully created")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise e
    return _driver

async def close_neo4j():
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
        logger.info("Neo4j Async Driver connection closed")

async def init_neo4j_constraints():
    driver = get_neo4j_driver()
    async with driver.session() as session:
        # Create constraint for Equipment tag
        try:
            await session.run("CREATE CONSTRAINT equipment_tag_unique IF NOT EXISTS FOR (e:Equipment) REQUIRE e.tag IS UNIQUE")
            await session.run("CREATE CONSTRAINT doc_id_unique IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE")
            await session.run("CREATE CONSTRAINT regulation_code_unique IF NOT EXISTS FOR (r:Regulation) REQUIRE r.code IS UNIQUE")
            await session.run("CREATE CONSTRAINT procedure_title_unique IF NOT EXISTS FOR (p:Procedure) REQUIRE p.title IS UNIQUE")
            logger.info("Neo4j database unique constraints verified/created")
        except Exception as e:
            logger.warning(f"Failed to create Neo4j constraints: {e}")
