import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { queryRateLimiter } from '../middleware/rateLimit.middleware';
import { queryRAGStream, getQueryHistory, getQueryDetail } from '../services/query.service';

const router = Router();

// POST /query — streaming SSE RAG answer
router.post(
  '/',
  authenticateJWT,
  queryRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { query, filters } = req.body;
    const plantId = req.user?.plantId;
    const userId = req.user?.sub;

    if (!query || !plantId || !userId) {
      res.status(400).json({ success: false, error: 'Query and authentication context are required' });
      return;
    }

    try {
      await queryRAGStream(query, plantId, userId, filters || {}, res);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /query/history
router.get('/history', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  const userId = req.user?.sub;
  const { page, limit } = req.query;

  try {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const result = await getQueryHistory(plantId!, userId!, pageNum, limitNum);
    res.json({
      success: true,
      data: result.queries,
      pagination: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /query/:id
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await getQueryDetail(req.params.id);
    if (!result) {
      res.status(404).json({ success: false, error: 'Query details not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
