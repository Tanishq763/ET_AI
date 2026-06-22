import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  getKGNodeAndNeighbors,
  getEquipmentSubgraph,
  runCypherQuery,
  getShortestPath,
} from '../services/kg.service';

const router = Router();

// GET /kg/node/:nodeId
router.get('/node/:nodeId', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const depth = Number(req.query.depth) || 1;
  try {
    const subgraph = await getKGNodeAndNeighbors(req.params.nodeId, depth);
    res.json({ success: true, data: subgraph });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /kg/equipment/:tag
router.get('/equipment/:tag', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const subgraph = await getEquipmentSubgraph(req.params.tag);
    res.json({ success: true, data: subgraph });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /kg/query
router.post('/query', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { cypher, params } = req.body;
  if (!cypher) {
    res.status(400).json({ success: false, error: 'Cypher query string is required' });
    return;
  }

  try {
    const results = await runCypherQuery(cypher, params || {});
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /kg/path
router.get('/path', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ success: false, error: 'Parameters from and to are required' });
    return;
  }

  try {
    const path = await getShortestPath(from as string, to as string);
    res.json({ success: true, data: path });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
