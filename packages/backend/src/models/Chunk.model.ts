import mongoose, { Schema, Document } from 'mongoose';
import { Chunk as IChunk } from '@ikip/shared';

export interface ChunkDocument extends Omit<IChunk, '_id' | 'documentId' | 'plant'>, Document {
  documentId: mongoose.Types.ObjectId;
  plant: mongoose.Types.ObjectId;
}

const ChunkSchema: Schema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    content: { type: String, required: true },
    contentHash: { type: String },
    pageNumbers: [{ type: Number }],
    chunkIndex: { type: Number, required: true },
    tokenCount: { type: Number },
    qdrantPointId: { type: String, unique: true, sparse: true },
    embeddingModel: { type: String },
    entities: [
      {
        text: { type: String, required: true },
        type: {
          type: String,
          enum: [
            'EQUIPMENT',
            'INSTRUMENT',
            'CHEMICAL',
            'PERSON',
            'REGULATION',
            'PARAMETER',
            'DATE',
            'LOCATION',
            'PROCEDURE',
            'ORGANIZATION',
          ],
          required: true,
        },
        confidence: { type: Number, default: 1.0 },
        normalizedId: { type: String },
        normalizedText: { type: String },
        context: { type: String },
      },
    ],
    chunkType: {
      type: String,
      enum: ['text', 'table', 'figure_caption', 'heading'],
      default: 'text',
      required: true,
    },
  },
  { timestamps: true }
);

ChunkSchema.index({ plant: 1, documentId: 1, chunkIndex: 1 });

export const ChunkModel = mongoose.model<ChunkDocument>('Chunk', ChunkSchema);
export default ChunkModel;
