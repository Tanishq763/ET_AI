import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { IncidentModel } from '../models/Incident.model';
import mongoose from 'mongoose';
import axios from 'axios';
import { env } from '../config/env';

const router = Router();

// GET /incidents
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  const { incidentType, severity, page, limit } = req.query;

  try {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query: any = { plant: new mongoose.Types.ObjectId(plantId) };
    if (incidentType) query.incidentType = incidentType;
    if (severity) query.severity = severity;

    const skip = (pageNum - 1) * limitNum;
    const incidents = await IncidentModel.find(query)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('equipmentInvolved', 'tag equipmentClass');

    const total = await IncidentModel.countDocuments(query);

    res.json({
      success: true,
      data: incidents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /incidents/:id
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const inc = await IncidentModel.findById(req.params.id).populate('equipmentInvolved', 'tag equipmentClass location');
    if (!inc) {
      res.status(404).json({ success: false, error: 'Incident report not found' });
      return;
    }
    res.json({ success: true, data: inc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /incidents
router.post(
  '/',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer', 'Technician']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    try {
      const inc = new IncidentModel({
        ...req.body,
        plant: plantId,
        reportedBy: req.user?.email,
      });

      await inc.save();

      // Trigger lessons learned analysis asynchronously
      try {
        await axios.post(`${env.AI_SERVICES_URL}/lessons/analyze-event`, {
          eventId: inc._id.toString(),
          eventType: 'Incident',
          description: inc.description || inc.title,
          equipmentTags: [], // tag lists will be resolved in python
          plantId: plantId!,
        });
      } catch (err: any) {
        console.error('⚠️ Failed to auto-trigger lessons learned analysis:', err.message);
      }

      res.status(201).json({ success: true, data: inc });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /incidents/:id/analysis - Get AI analysis of incident
router.get(
  '/:id/analysis',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    try {
      const inc = await IncidentModel.findById(req.params.id);
      if (!inc) {
        res.status(404).json({ success: false, error: 'Incident report not found' });
        return;
      }

      const response = await axios.post(`${env.AI_SERVICES_URL}/lessons/analyze-event`, {
        eventId: inc._id.toString(),
        eventType: 'Incident',
        description: inc.description || inc.title,
        equipmentTags: [],
        plantId: plantId!,
      });

      res.json({
        success: true,
        data: {
          patterns: response.data.patterns || [],
          similarIncidents: response.data.similarEventIds || [],
          alerts: response.data.alerts || [],
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
