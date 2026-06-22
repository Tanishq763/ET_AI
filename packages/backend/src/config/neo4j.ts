import neo4j, { Driver, Session } from 'neo4j-driver';
import { env } from './env';

let driver: Driver | null = null;

export const initNeo4j = (): Driver => {
  if (!driver) {
    try {
      driver = neo4j.driver(
        env.NEO4J_URI,
        neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD),
        { disableLosslessIntegers: true }
      );
      console.log('✅ Neo4j Graph DB Driver Initialized');
    } catch (error) {
      console.error('❌ Neo4j Driver Initialization Error:', error);
      throw error;
    }
  }
  return driver;
};

export const getNeo4jDriver = (): Driver => {
  if (!driver) {
    return initNeo4j();
  }
  return driver;
};

export const getNeo4jSession = (database?: string): Session => {
  const drv = getNeo4jDriver();
  return drv.session({ database: database || 'neo4j' });
};

export const closeNeo4j = async (): Promise<void> => {
  if (driver) {
    await driver.close();
    driver = null;
    console.log('🔒 Neo4j Driver closed');
  }
};
