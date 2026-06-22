import mongoose, { Schema, Document } from 'mongoose';
import { Plant as IPlant } from '@ikip/shared';

export interface PlantDocument extends Omit<IPlant, '_id'>, Document {}

const PlantSchema: Schema = new Schema(
  {
    plantId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    industry: { type: String, required: true },
  },
  { timestamps: true }
);

export const PlantModel = mongoose.model<PlantDocument>('Plant', PlantSchema);
export default PlantModel;
