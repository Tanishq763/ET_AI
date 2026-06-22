import mongoose, { Schema, Document } from 'mongoose';
import { Equipment as IEquipment } from '@ikip/shared';

export interface EquipmentDocument extends Omit<IEquipment, '_id' | 'plant' | 'linkedDocuments'>, Omit<Document, 'model'> {
  plant: mongoose.Types.ObjectId;
  linkedDocuments: mongoose.Types.ObjectId[];
}

const EquipmentSchema: Schema = new Schema(
  {
    tag: { type: String, required: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    equipmentClass: {
      type: String,
      enum: [
        'Pump',
        'Compressor',
        'Vessel',
        'HeatExchanger',
        'Valve',
        'Instrument',
        'Motor',
        'Piping',
        'Tank',
        'Other',
      ],
      required: true,
    },
    description: { type: String },
    manufacturer: { type: String },
    model: { type: String },
    serialNumber: { type: String },
    installedDate: { type: Date },
    location: { type: String },
    pidReference: { type: String },
    operationalStatus: {
      type: String,
      enum: ['Running', 'Standby', 'UnderMaintenance', 'Decommissioned'],
      default: 'Running',
      required: true,
    },
    criticality: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
      required: true,
    },
    linkedDocuments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    kgNodeId: { type: String },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDue: { type: Date },
    mtbf: { type: Number }, // Mean time between failures in hours
    specifications: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

// Equipment tag must be unique per plant
EquipmentSchema.index({ plant: 1, tag: 1 }, { unique: true });
EquipmentSchema.index({ plant: 1, equipmentClass: 1 });
EquipmentSchema.index({ plant: 1, operationalStatus: 1 });

export const EquipmentModel = mongoose.model<EquipmentDocument>('Equipment', EquipmentSchema);
export default EquipmentModel;
