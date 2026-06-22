import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import {
  uploadDocument,
  listDocuments,
  getDocumentMetadata,
  pipeDocumentDownload,
  deleteDocument,
  getDocumentChunks,
} from '../services/document.service';
import { enqueueIngestion } from '../services/ingestion.service';

const router = Router();

// POST /documents/upload
router.post(
  '/upload',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin', 'Engineer']),
  uploadMiddleware.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded or file rejected by filter' });
        return;
      }

      const { title, docType } = req.body;
      const plantId = req.user?.plantId;

      if (!title || !docType || !plantId) {
        res.status(400).json({ success: false, error: 'Missing title, docType, or plantId context' });
        return;
      }

      const doc = await uploadDocument(
        req.file,
        title,
        docType,
        plantId,
        req.user!.sub
      );

      res.status(201).json({
        success: true,
        data: {
          documentId: doc._id,
          status: doc.ingestionStatus,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /documents
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const plantId = req.user?.plantId;
  const { docType, status, page, limit, search } = req.query;

  try {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const result = await listDocuments(
      plantId!,
      {
        docType: docType as string,
        status: status as string,
        search: search as string,
      },
      pageNum,
      limitNum
    );

    res.json({
      success: true,
      data: result.documents,
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

// GET /documents/:id
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doc = await getDocumentMetadata(req.params.id);
    res.json({ success: true, data: doc });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// GET /documents/:id/download
router.get('/:id/download', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await pipeDocumentDownload(req.params.id, res);
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// GET /documents/:id/chunks
router.get('/:id/chunks', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const chunks = await getDocumentChunks(req.params.id);
    res.json({ success: true, data: chunks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /documents/:id
router.delete(
  '/:id',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await deleteDocument(req.params.id);
      res.json({ success: true, data: { success: true } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /documents/:id/reingest
router.post(
  '/:id/reingest',
  authenticateJWT,
  requireRoles(['SuperAdmin', 'PlantAdmin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const doc = await getDocumentMetadata(req.params.id);
      
      const jobId = await enqueueIngestion(
        doc._id.toString(),
        doc.gridfsId.toString(),
        doc.plant.toString(),
        doc.docType,
        doc.title
      );

      res.json({ success: true, data: { jobId } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
