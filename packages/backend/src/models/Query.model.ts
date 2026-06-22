import mongoose, { Schema, Document } from 'mongoose';
import { QueryResponse } from '@ikip/shared';

export interface QueryDocument extends Omit<QueryResponse, '_id' | 'plantId' | 'userId'>, Document {
  plantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
}

const QuerySchema: Schema = new Schema(
  {
    query: { type: String, required: true },
    answer: { type: String, required: true },
    sources: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
        title: { type: String, required: true },
        pageNumbers: [{ type: Number }],
        confidence: { type: Number },
        textPreview: { type: String }
      }
    ],
    confidence: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
    suggestedQueries: [{ type: String }],
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true }
  },
  { timestamps: true }
);

export const QueryModel = mongoose.model<QueryDocument>('Query', QuerySchema);
export default QueryModel;
