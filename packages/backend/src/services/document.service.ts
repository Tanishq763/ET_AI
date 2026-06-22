import { DocumentModel } from '../models/Document.model';
import { getGridFSBucket } from '../config/db';
import mongoose from 'mongoose';
import { DocType } from '@ikip/shared';
import { enqueueIngestion } from './ingestion.service';
import { getNeo4jSession } from '../config/neo4j';
import { ChunkModel } from '../models/Chunk.model';

export const uploadDocument = async (
  file: Express.Multer.File,
  title: string,
  docType: DocType,
  plantId: string,
  userId: string
) => {
  const gridfsId = (file as any).id || (file as any).gridfsId;
  if (!gridfsId) {
    throw new Error('File not correctly saved in GridFS storage');
  }

  const document = new DocumentModel({
    title,
    originalName: file.originalname,
    docType,
    plant: new mongoose.Types.ObjectId(plantId),
    uploadedBy: new mongoose.Types.ObjectId(userId),
    gridfsId: new mongoose.Types.ObjectId(gridfsId),
    mimeType: file.mimetype,
    fileSizeBytes: file.size,
    ingestionStatus: 'queued',
  });

  await document.save();

  // Enqueue ingestion job
  await enqueueIngestion(
    document._id.toString(),
    gridfsId.toString(),
    plantId,
    docType,
    title
  );

  return document;
};

export const getDocumentMetadata = async (docId: string) => {
  const doc = await DocumentModel.findById(docId).populate('uploadedBy', 'name email role');
  if (!doc) {
    throw new Error('Document not found');
  }
  return doc;
};

export const listDocuments = async (
  plantId: string,
  filters: { docType?: string; status?: string; search?: string },
  page = 1,
  limit = 20
) => {
  const query: any = { plant: new mongoose.Types.ObjectId(plantId) };

  if (filters.docType) {
    query.docType = filters.docType;
  }
  if (filters.status) {
    query.ingestionStatus = filters.status;
  }
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const skip = (page - 1) * limit;
  const documents = await DocumentModel.find(query)
    .sort({ uploadedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'name');

  const total = await DocumentModel.countDocuments(query);

  return { documents, total };
};

export const pipeDocumentDownload = async (
  docId: string,
  res: any
): Promise<void> => {
  const doc = await DocumentModel.findById(docId);
  if (!doc) {
    throw new Error('Document metadata not found');
  }

  const bucket = getGridFSBucket();
  const fileId = new mongoose.Types.ObjectId(doc.gridfsId);

  res.set('Content-Type', doc.mimeType || 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);

  const downloadStream = bucket.openDownloadStream(fileId);
  downloadStream.on('error', (err) => {
    console.error('❌ GridFS OpenDownloadStream error:', err);
    res.status(404).json({ success: false, error: 'File binary not found' });
  });

  downloadStream.pipe(res);
};

export const deleteDocument = async (docId: string): Promise<void> => {
  const doc = await DocumentModel.findById(docId);
  if (!doc) {
    throw new Error('Document not found');
  }

  // 1. Delete file from GridFS
  const bucket = getGridFSBucket();
  try {
    await bucket.delete(new mongoose.Types.ObjectId(doc.gridfsId));
  } catch (err) {
    console.error('⚠️ Failed to delete GridFS binary:', err);
  }

  // 2. Delete chunks from MongoDB
  await ChunkModel.deleteMany({ documentId: doc._id });

  // 3. Delete Document node and relationships in Neo4j
  if (doc.kgNodeId) {
    const session = getNeo4jSession();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          'MATCH (d:Document {id: $docId}) DETACH DELETE d',
          { docId: docId }
        )
      );
    } catch (err) {
      console.error('⚠️ Failed to delete Neo4j Document node:', err);
    } finally {
      await session.close();
    }
  }

  // 4. Delete document metadata
  await DocumentModel.findByIdAndDelete(docId);
};

export const getDocumentChunks = async (docId: string) => {
  return ChunkModel.find({ documentId: new mongoose.Types.ObjectId(docId) }).sort({ chunkIndex: 1 });
};
