import mongoose, { Schema, Document } from 'mongoose';
import { Incident as IIncident } from '@ikip/shared';

export interface IncidentDocument extends Omit<IIncident, '_id' | 'plant' | 'equipmentInvolved' | 'aiSimilarIncidentIds' | 'linkedDocuments'>, Document {
  plant: mongoose.Types.ObjectId;
  equipmentInvolved?: mongoose.Types.ObjectId[];
  aiSimilarIncidentIds?: mongoose.Types.ObjectId[];
  linkedDocuments?: mongoose.Types.ObjectId[];
}

const IncidentSchema: Schema = new Schema(
  {
    incidentNumber: { type: String, required: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    incidentType: {
      type: String,
      enum: [
        'Accident',
        'NearMiss',
        'DangerousOccurrence',
        'EnvironmentalRelease',
        'QualityNonConformance',
        'FireExplosion',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['Fatality', 'LTI', 'MedicalTreatment', 'FirstAid', 'NearMiss', 'PropertyDamage'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    equipmentInvolved: [{ type: Schema.Types.ObjectId, ref: 'Equipment', index: true }],
    occurredAt: { type: Date, required: true },
    reportedAt: { type: Date, default: Date.now },
    reportedBy: { type: String },
    
    // --- Investigation ---
    immediateActions: { type: String },
    rootCauseAnalysis: { type: String },
    contributingFactors: [{ type: String }],
    lessonsLearned: { type: String },
    correctiveActions: [
      {
        action: { type: String, required: true },
        owner: { type: String, required: true },
        dueDate: { type: Date, required: true },
        status: { type: String, enum: ['Open', 'InProgress', 'Closed'], default: 'Open' },
      },
    ],
    
    // --- AI Analysis ---
    aiPatternTags: [{ type: String }],
    aiSimilarIncidentIds: [{ type: Schema.Types.ObjectId, ref: 'Incident' }],
    aiRiskScore: { type: Number },
    linkedDocuments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    kgNodeId: { type: String },
    
    status: {
      type: String,
      enum: ['UnderInvestigation', 'CorrectiveActionPending', 'Closed'],
      default: 'UnderInvestigation',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

IncidentSchema.index({ plant: 1, incidentNumber: 1 }, { unique: true });
IncidentSchema.index({ plant: 1, status: 1 });
IncidentSchema.index({ plant: 1, severity: 1 });

export const IncidentModel = mongoose.model<IncidentDocument>('Incident', IncidentSchema);
export default IncidentModel;
