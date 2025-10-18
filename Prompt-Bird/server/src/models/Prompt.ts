import mongoose, { Schema, type Document, type InferSchemaType } from 'mongoose';

const CollaboratorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  },
  { _id: false }
);

const PromptSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'PromptFolder', default: null, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    description: { type: String },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    currentVersionId: { type: Schema.Types.ObjectId, ref: 'PromptVersion' },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    isPinned: { type: Boolean, default: false },
    collaborators: { type: [CollaboratorSchema], default: [] },
    lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    folderPath: { type: String },
  },
  { timestamps: true }
);

PromptSchema.index({ workspaceId: 1, title: 1 });
PromptSchema.index({ workspaceId: 1, tags: 1 });
PromptSchema.index({ workspaceId: 1, updatedAt: -1 });

export type PromptDocument = Document & InferSchemaType<typeof PromptSchema>;

export const PromptModel = mongoose.model('Prompt', PromptSchema);
