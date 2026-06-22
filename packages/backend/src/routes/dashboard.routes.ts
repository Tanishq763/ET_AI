import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { DocumentModel } from '../models/Document.model';
import { WorkOrderModel } from '../models/WorkOrder.model';
import { ComplianceMappingModel } from '../models/ComplianceMapping.model';
import { IncidentModel } from '../models/Incident.model';

const router = Router();

// GET /dashboard/kpis
router.get('/kpis', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  const pid = new mongoose.Types.ObjectId(plantId);

  try {
    const docsIngested = await DocumentModel.countDocuments({ plant: pid, ingestionStatus: 'completed' });
    const openWOs = await WorkOrderModel.countDocuments({ plant: pid, status: { $in: ['Open', 'InProgress'] } });

    // Calculate compliance score: Compliant / Total Assessed (excluding NotAssessed)
    const totalAssessed = await ComplianceMappingModel.countDocuments({
      plant: pid,
      complianceStatus: { $in: ['Compliant', 'PartiallyCompliant', 'NonCompliant'] },
    });

    const compliantCount = await ComplianceMappingModel.countDocuments({
      plant: pid,
      complianceStatus: 'Compliant',
    });

    const complianceScore = totalAssessed > 0 ? Math.round((compliantCount / totalAssessed) * 100) : 100;

    // Total downtime from completed corrective work orders
    const downtimeRes = await WorkOrderModel.aggregate([
      { $match: { plant: pid, status: 'Completed', woType: 'Corrective' } },
      { $group: { _id: null, total: { $sum: '$downtimeHours' } } },
    ]);

    const downtime = downtimeRes.length > 0 ? downtimeRes[0].total : 0;

    res.json({
      success: true,
      data: {
        downtime,
        openWOs,
        complianceScore,
        docsIngested,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /dashboard/alerts
router.get('/alerts', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  const pid = new mongoose.Types.ObjectId(plantId);

  try {
    // Return mock recent AI-pushed alerts or pull from DB. We can query incident reports that have AI alerts or similar.
    const criticalGaps = await ComplianceMappingModel.find({
      plant: pid,
      complianceStatus: 'NonCompliant',
      severity: { $in: ['Critical', 'High'] },
    })
      .sort({ lastAssessedAt: -1 })
      .limit(5);

    const formatAlerts = criticalGaps.map((gap) => ({
      id: gap._id,
      type: 'compliance',
      title: `Compliance Non-Conformity: ${gap.regulationCode}`,
      message: `Clause ${gap.clauseNumber} - ${gap.clauseTitle} is non-compliant. Gap: ${gap.gapDescription}`,
      urgency: gap.severity === 'Critical' ? 'Critical' : 'High',
      timestamp: gap.lastAssessedAt || gap.createdAt,
    }));

    res.json({ success: true, data: formatAlerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
