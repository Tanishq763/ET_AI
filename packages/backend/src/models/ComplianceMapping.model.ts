import mongoose, { Schema, Document } from 'mongoose';
import { ComplianceMapping as IComplianceMapping } from '@ikip/shared';

export interface ComplianceMappingDocument extends Omit<IComplianceMapping, '_id' | 'plant' | 'evidenceDocumentIds' | 'evidenceChunkIds'>, Document {
  plant: mongoose.Types.ObjectId;
  evidenceDocumentIds?: mongoose.Types.ObjectId[];
  evidenceChunkIds?: mongoose.Types.ObjectId[];
}

const ComplianceMappingSchema: Schema = new Schema(
  {
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    regulationCode: { type: String, required: true, index: true },
    clauseNumber: { type: String, required: true },
    clauseTitle: { type: String, required: true },
    clauseText: { type: String, required: true },
    regulatoryBody: {
      type: String,
      enum: ['OISD', 'PESO', 'MoEF', 'BIS', 'FactoryAct', 'ISO', 'Other'],
      required: true,
    },
    complianceStatus: {
      type: String,
      enum: ['Compliant', 'PartiallyCompliant', 'NonCompliant', 'NotAssessed'],
      default: 'NotAssessed',
      required: true,
      index: true,
    },
    gapDescription: { type: String },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      index: true,
    },
    evidenceDocumentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    evidenceChunkIds: [{ type: Schema.Types.ObjectId, ref: 'Chunk' }],
    evidenceSummary: { type: String },
    correctiveAction: { type: String },
    responsiblePerson: { type: String },
    targetDate: { type: Date },
    lastAssessedAt: { type: Date },
    assessedBy: {
      type: String,
      enum: ['AI', 'Human', 'AI+Human'],
      default: 'AI',
    },
    aiConfidence: { type: Number },
  },
  { timestamps: true }
);

ComplianceMappingSchema.index({ plant: 1, regulationCode: 1, clauseNumber: 1 }, { unique: true });

export const ComplianceMappingModel = mongoose.model<ComplianceMappingDocument>('ComplianceMapping', ComplianceMappingSchema);
export default ComplianceMappingModel;
