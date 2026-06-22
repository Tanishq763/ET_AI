import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import {
  createEquipment,
  updateEquipment,
  listEquipment,
  getEquipment360View,
} from '../services/equipment.service';

const router = Router();

// GET /equipment
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  const { equipmentClass, operationalStatus, criticality, page, limit } = req.query;

  try {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await listEquipment(
      plantId!,
      {
        equipmentClass: equipmentClass as string,
        operationalStatus: operationalStatus as string,
        criticality: criticality as string,
      },
      pageNum,
      limitNum
    );

    res.json({
      success: true,
      data: result.equipment,
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

// GET /equipment/:tag - Equipment Passport 360 view
router.get('/:tag', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  try {
    const result = await getEquipment360View(req.params.tag, plantId!);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// POST /equipment
router.post(
  '/',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    try {
      const eq = await createEquipment({
        ...req.body,
        plant: plantId,
      });
      res.status(201).json({ success: true, data: eq });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /equipment/:tag
router.put(
  '/:tag',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const plantId = req.user?.plantId;
    try {
      const eq = await updateEquipment(req.params.tag, plantId!, req.body);
      res.json({ success: true, data: eq });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
