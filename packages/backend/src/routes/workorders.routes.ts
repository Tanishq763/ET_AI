import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import {
  createWorkOrder,
  listWorkOrders,
  getWorkOrderDetail,
  runRCAAnalysis,
} from '../services/workorder.service';

const router = Router();

// GET /workorders
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  const { equipment, woType, status, page, limit } = req.query;

  try {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await listWorkOrders(
      plantId!,
      {
        equipment: equipment as string,
        woType: woType as string,
        status: status as string,
      },
      pageNum,
      limitNum
    );

    res.json({
      success: true,
      data: result.workOrders,
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

// GET /workorders/:id
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const wo = await getWorkOrderDetail(req.params.id);
    if (!wo) {
      res.status(404).json({ success: false, error: 'Work Order not found' });
      return;
    }
    res.json({ success: true, data: wo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /workorders
router.post(
  '/',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer', 'Technician']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    try {
      const wo = await createWorkOrder({
        ...req.body,
        plant: plantId,
        reportedBy: req.user?.email,
      });

      // If WO is Corrective and Completed, auto-trigger RCA analysis
      if (wo.woType === 'Corrective' && wo.status === 'Completed') {
        try {
          await runRCAAnalysis(wo._id.toString());
        } catch (rcaErr: any) {
          console.error('⚠️ Auto-RCA Trigger failed on WO creation:', rcaErr.message);
        }
      }

      res.status(201).json({ success: true, data: wo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /workorders/:id/rca - Trigger / retrieve RCA recommendation
router.get(
  '/:id/rca',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await runRCAAnalysis(req.params.id);
      res.json({
        success: true,
        data: {
          rca: result.wo.aiRcaSuggestion,
          confidence: result.wo.aiRcaConfidence,
          recommendations: result.recommendations,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
