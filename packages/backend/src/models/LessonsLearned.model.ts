import mongoose, { Schema, Document } from 'mongoose';
import { LessonsLearned as ILessonsLearned } from '@ikip/shared';

export interface LessonsLearnedDocument extends Omit<ILessonsLearned, '_id' | 'plant'>, Document {
  plant: mongoose.Types.ObjectId;
}

const LessonsLearnedSchema: Schema = new Schema(
  {
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    equipmentTags: [{ type: String, index: true }],
    failureModes: [{ type: String }],
    recommendations: [{ type: String }],
  },
  { timestamps: true }
);

export const LessonsLearnedModel = mongoose.model<LessonsLearnedDocument>('LessonsLearned', LessonsLearnedSchema);
export default LessonsLearnedModel;
