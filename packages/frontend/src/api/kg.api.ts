import { api } from './client';

export const kgApi = {
  getNodeNeighbors: async (nodeId: string, depth = 1) => {
    const res = await api.get(`/kg/node/${encodeURIComponent(nodeId)}`, { params: { depth } });
    return res.data;
  },

  getEquipmentSubgraph: async (tag: string) => {
    const res = await api.get(`/kg/equipment/${encodeURIComponent(tag)}`);
    return res.data;
  },

  runCypher: async (cypher: string, params = {}) => {
    const res = await api.post('/kg/query', { cypher, params });
    return res.data;
  },

  getShortestPath: async (fromNode: string, toNode: string) => {
    const res = await api.get('/kg/path', { params: { from: fromNode, to: toNode } });
    return res.data;
  }
};
export default kgApi;
