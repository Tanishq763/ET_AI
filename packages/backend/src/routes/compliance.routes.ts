import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import {
  listComplianceGaps,
  getComplianceDashboardSummary,
  triggerComplianceScan,
} from '../services/compliance.service';
import { generateAuditEvidencePackage } from '../services/export.service';

const router = Router();

// GET /compliance/dashboard
router.get(
  '/dashboard',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer', 'Auditor']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    try {
      const summary = await getComplianceDashboardSummary(plantId!);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /compliance/gaps
router.get(
  '/gaps',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer', 'Auditor']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    const { regulationCode, complianceStatus, page, limit } = req.query;

    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;

      const result = await listComplianceGaps(
        plantId!,
        {
          regulationCode: regulationCode as string,
          complianceStatus: complianceStatus as string,
        },
        pageNum,
        limitNum
      );

      res.json({
        success: true,
        data: result.gaps,
        pagination: {
          total: result.total,
          page: pageNum,
          limit: limitNum,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /compliance/scan
router.post(
  '/scan',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    const { regulations } = req.body;

    try {
      const jobId = await triggerComplianceScan(plantId!, regulations);
      res.json({ success: true, data: { jobId } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /compliance/evidence-package/:regulationCode
router.get(
  '/evidence-package/:regulationCode',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Auditor', 'Engineer']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    const { regulationCode } = req.params;

    try {
      await generateAuditEvidencePackage(regulationCode, plantId!, res);
    } catch (error: any) {
      console.error('❌ Evidence Package generation failed:', error.message);
      res.status(500).json({ success: false, error: error.message || 'Failed to generate PDF' });
    }
  }
);

export default router;
