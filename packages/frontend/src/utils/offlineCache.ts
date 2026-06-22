import { openDB } from 'idb';

const DB_NAME = 'ikip_offline_db';
const EQUIPMENT_STORE = 'equipment_passport_cache';
const QUERY_STORE = 'recent_queries_cache';

const getDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(EQUIPMENT_STORE)) {
        db.createObjectStore(EQUIPMENT_STORE, { keyPath: 'tag' });
      }
      if (!db.objectStoreNames.contains(QUERY_STORE)) {
        db.createObjectStore(QUERY_STORE, { keyPath: 'query' });
      }
    },
  });
};

export const offlineCache = {
  // --- Equipment Cache ---
  cacheEquipment: async (tag: string, data: any) => {
    try {
      const db = await getDB();
      await db.put(EQUIPMENT_STORE, { tag, data, cachedAt: new Date() });
    } catch (err) {
      console.error('Failed to cache equipment offline:', err);
    }
  },

  getCachedEquipment: async (tag: string) => {
    try {
      const db = await getDB();
      const record = await db.get(EQUIPMENT_STORE, tag);
      return record ? record.data : null;
    } catch (err) {
      console.error('Failed to read cached equipment:', err);
      return null;
    }
  },

  // --- Query Cache ---
  cacheQuery: async (query: string, answer: string, sources: any[]) => {
    try {
      const db = await getDB();
      await db.put(QUERY_STORE, {
        query,
        answer,
        sources,
        cachedAt: new Date(),
      });
    } catch (err) {
      console.error('Failed to cache RAG query offline:', err);
    }
  },

  getCachedQuery: async (query: string) => {
    try {
      const db = await getDB();
      return await db.get(QUERY_STORE, query);
    } catch (err) {
      console.error('Failed to read cached query:', err);
      return null;
    }
  },

  listCachedQueries: async () => {
    try {
      const db = await getDB();
      return await db.getAll(QUERY_STORE);
    } catch (err) {
      console.error('Failed to list cached queries:', err);
      return [];
    }
  },
};
export default offlineCache;
