import { getNeo4jSession } from '../config/neo4j';
import { GraphNode, GraphEdge, GraphSubgraph } from '@ikip/shared';

// Helper to format Neo4j integer / properties
const formatNode = (neoNode: any): GraphNode => {
  return {
    id: neoNode.identity.toString(),
    label: neoNode.properties.tag || neoNode.properties.title || neoNode.properties.name || neoNode.properties.id || neoNode.labels[0] || neoNode.identity.toString(),
    properties: Object.keys(neoNode.properties).reduce((acc, key) => {
      const val = neoNode.properties[key];
      acc[key] = typeof val === 'object' && val.low !== undefined ? val.low : val;
      return acc;
    }, { _identity: neoNode.identity.toString(), _label: neoNode.labels[0] } as Record<string, any>),
  };
};

const formatEdge = (neoRel: any): GraphEdge => {
  return {
    id: neoRel.identity.toString(),
    source: neoRel.start.toString(),
    target: neoRel.end.toString(),
    type: neoRel.type,
    properties: Object.keys(neoRel.properties).reduce((acc, key) => {
      const val = neoRel.properties[key];
      acc[key] = typeof val === 'object' && val.low !== undefined ? val.low : val;
      return acc;
    }, {} as Record<string, any>),
  };
};

export const getKGNodeAndNeighbors = async (nodeId: string, depth = 1): Promise<GraphSubgraph> => {
  const session = getNeo4jSession();
  const nodesMap = new Map<string, GraphNode>();
  const edgesList: GraphEdge[] = [];

  try {
    const query = `
      MATCH (n) WHERE n.id = $nodeId OR n.tag = $nodeId
      MATCH path = (n)-[r*1..${depth}]-(m)
      RETURN nodes(path) AS nodes, relationships(path) AS rels
      LIMIT 100
    `;

    const result = await session.run(query, { nodeId });

    for (const record of result.records) {
      const nodes = record.get('nodes');
      const rels = record.get('rels');

      for (const node of nodes) {
        const formatted = formatNode(node);
        nodesMap.set(node.identity.toString(), formatted);
      }

      for (const rel of rels) {
        edgesList.push(formatEdge(rel));
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges: edgesList,
    };
  } finally {
    await session.close();
  }
};

export const getEquipmentSubgraph = async (tag: string): Promise<GraphSubgraph> => {
  const session = getNeo4jSession();
  const nodesMap = new Map<string, GraphNode>();
  const edgesList: GraphEdge[] = [];

  try {
    const query = `
      MATCH (e:Equipment {tag: $tag})
      MATCH path = (e)-[r]-(m)
      RETURN nodes(path) AS nodes, relationships(path) AS rels
      LIMIT 50
    `;

    const result = await session.run(query, { tag });

    for (const record of result.records) {
      const nodes = record.get('nodes');
      const rels = record.get('rels');

      for (const node of nodes) {
        const formatted = formatNode(node);
        nodesMap.set(node.identity.toString(), formatted);
      }

      for (const rel of rels) {
        edgesList.push(formatEdge(rel));
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges: edgesList,
    };
  } finally {
    await session.close();
  }
};

export const runCypherQuery = async (cypher: string, params = {}): Promise<any[]> => {
  // Validate safety (prevent writes if needed, though role is checked)
  const isWrite = /create|delete|set|remove|merge|drop/i.test(cypher);
  if (isWrite) {
    throw new Error('Write operations are forbidden through this query API');
  }

  const session = getNeo4jSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject());
  } finally {
    await session.close();
  }
};

export const getShortestPath = async (fromId: string, toId: string): Promise<GraphSubgraph> => {
  const session = getNeo4jSession();
  const nodesMap = new Map<string, GraphNode>();
  const edgesList: GraphEdge[] = [];

  try {
    const query = `
      MATCH (start {id: $fromId}), (end {id: $toId})
      MATCH path = shortestPath((start)-[*..10]-(end))
      RETURN nodes(path) AS nodes, relationships(path) AS rels
    `;

    const result = await session.run(query, { fromId, toId });

    if (result.records.length > 0) {
      const record = result.records[0];
      const nodes = record.get('nodes');
      const rels = record.get('rels');

      for (const node of nodes) {
        const formatted = formatNode(node);
        nodesMap.set(node.identity.toString(), formatted);
      }

      for (const rel of rels) {
        edgesList.push(formatEdge(rel));
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges: edgesList,
    };
  } finally {
    await session.close();
  }
};
