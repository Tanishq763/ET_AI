import mongoose, { Schema, Document } from 'mongoose';
import { DocumentMeta as IDocumentMeta } from '@ikip/shared';

export interface DocumentMetaDocument extends Omit<IDocumentMeta, '_id' | 'plant' | 'uploadedBy' | 'previousVersionId'>, Document {
  plant: mongoose.Types.ObjectId;
  uploadedBy?: mongoose.Types.ObjectId;
  previousVersionId?: mongoose.Types.ObjectId;
}

const DocumentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    originalName: { type: String, required: true },
    docType: {
      type: String,
      enum: [
        'PID',
        'SOP',
        'WorkOrder',
        'InspectionReport',
        'OEMManual',
        'IncidentReport',
        'RegulatorySubmission',
        'EmailArchive',
        'ProjectFile',
        'Other',
      ],
      required: true,
    },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    
    // --- Storage ---
    gridfsId: { type: Schema.Types.ObjectId, required: true },
    mimeType: { type: String },
    fileSizeBytes: { type: Number },
    pageCount: { type: Number },
    
    // --- Ingestion State ---
    ingestionStatus: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    ingestionStartedAt: { type: Date },
    ingestionCompletedAt: { type: Date },
    ingestionError: { type: String },
    
    // --- Extracted Metadata ---
    language: { type: String, default: 'en' },
    extractedDate: { type: Date },
    revisionNumber: { type: String },
    equipmentTagsFound: [{ type: String }],
    regulatoryReferences: [{ type: String }],
    
    // --- Knowledge Graph ---
    kgNodeId: { type: String },
    kgSyncedAt: { type: Date },
    
    // --- Versioning ---
    version: { type: Number, default: 1 },
    previousVersionId: { type: Schema.Types.ObjectId, ref: 'Document' },
    
    // --- Compliance ---
    complianceScope: [{ type: String }],
    nextReviewDate: { type: Date },
    
    // --- Search ---
    tags: [{ type: String }],
    summary: { type: String },
  },
  { timestamps: true }
);

// Indexes for fast searching
DocumentSchema.index({ plant: 1, docType: 1 });
DocumentSchema.index({ plant: 1, ingestionStatus: 1 });
DocumentSchema.index({ title: 'text', summary: 'text', tags: 'text' });

export const DocumentModel = mongoose.model<DocumentMetaDocument>('Document', DocumentSchema);
export default DocumentModel;
