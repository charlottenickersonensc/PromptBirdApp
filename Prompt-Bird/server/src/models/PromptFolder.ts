import mongoose, { Schema, type Document, type InferSchemaType } from 'mongoose';

const PromptFolderSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'PromptFolder', default: null },
    position: { type: Number, default: 0 },
    isExpandedByUser: {
      type: Map,
      of: Boolean,
      default: () => new Map(),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PromptFolderSchema.index({ workspaceId: 1, parentId: 1, position: 1 });

export type PromptFolderDocument = Document & InferSchemaType<typeof PromptFolderSchema>;

export const PromptFolderModel = mongoose.model('PromptFolder', PromptFolderSchema);
