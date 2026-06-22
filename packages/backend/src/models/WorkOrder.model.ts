import mongoose, { Schema, Document } from 'mongoose';
import { WorkOrder as IWorkOrder } from '@ikip/shared';

export interface WorkOrderDocument extends Omit<IWorkOrder, '_id' | 'plant' | 'equipment' | 'similarWOIds' | 'linkedDocuments'>, Document {
  plant: mongoose.Types.ObjectId;
  equipment?: mongoose.Types.ObjectId;
  similarWOIds?: mongoose.Types.ObjectId[];
  linkedDocuments?: mongoose.Types.ObjectId[];
}

const WorkOrderSchema: Schema = new Schema(
  {
    woNumber: { type: String, required: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    equipment: { type: Schema.Types.ObjectId, ref: 'Equipment', index: true },
    equipmentTag: { type: String, index: true },
    woType: {
      type: String,
      enum: ['Corrective', 'Preventive', 'Predictive', 'Emergency', 'Inspection'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['Emergency', 'High', 'Medium', 'Low'],
      required: true,
    },
    title: { type: String, required: true },
    problemDescription: { type: String },
    workPerformed: { type: String },
    
    // --- Failure Data (Corrective) ---
    failureCode: { type: String },
    failureMechanism: { type: String },
    rootCause: { type: String },
    failureMode: { type: String },
    
    // --- Parts & Labour ---
    partsUsed: [
      {
        partNumber: { type: String },
        description: { type: String },
        quantity: { type: Number },
        unitCost: { type: Number },
      },
    ],
    labourHours: { type: Number },
    totalCost: { type: Number },
    
    // --- Timeline ---
    reportedAt: { type: Date, default: Date.now },
    scheduledStart: { type: Date },
    actualStart: { type: Date },
    completedAt: { type: Date },
    downtimeHours: { type: Number },
    
    // --- Personnel ---
    reportedBy: { type: String },
    assignedTo: [{ type: String }],
    supervisedBy: { type: String },
    
    // --- AI Fields ---
    aiRcaSuggestion: { type: String },
    aiRcaConfidence: { type: Number },
    similarWOIds: [{ type: Schema.Types.ObjectId, ref: 'WorkOrder' }],
    linkedDocuments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    kgNodeId: { type: String },
    
    status: {
      type: String,
      enum: ['Open', 'InProgress', 'OnHold', 'Completed', 'Cancelled'],
      default: 'Open',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Unique woNumber per plant
WorkOrderSchema.index({ plant: 1, woNumber: 1 }, { unique: true });
WorkOrderSchema.index({ plant: 1, status: 1 });
WorkOrderSchema.index({ plant: 1, woType: 1 });

export const WorkOrderModel = mongoose.model<WorkOrderDocument>('WorkOrder', WorkOrderSchema);
export default WorkOrderModel;
