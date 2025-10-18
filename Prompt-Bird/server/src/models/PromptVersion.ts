import mongoose, { Schema, type Document, type InferSchemaType } from 'mongoose';

const DiffChunkSchema = new Schema(
  {
    type: { type: String, enum: ['added', 'removed', 'unchanged'], required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const PromptVersionSchema = new Schema(
  {
    promptId: { type: Schema.Types.ObjectId, ref: 'Prompt', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    content: { type: String, required: true },
    comment: { type: String },
    diff: { type: [DiffChunkSchema], default: [] },
    versionNumber: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PromptVersionSchema.index({ promptId: 1, versionNumber: -1 }, { unique: true });

export type PromptVersionDocument = Document & InferSchemaType<typeof PromptVersionSchema>;

export const PromptVersionModel = mongoose.model('PromptVersion', PromptVersionSchema);
