export interface GraphNode {
  id: string;
  label: string; // e.g. Equipment, Document, Regulation
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string; // e.g. APPEARS_IN, GOVERNS, LOCATED_IN
  properties: Record<string, any>;
}

export interface GraphSubgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KGPathRequest {
  from: string;
  to: string;
}

export interface KGCypherRequest {
  cypher: string;
  params?: Record<string, any>;
}
