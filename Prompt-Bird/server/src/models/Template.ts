import mongoose, { Schema, type Document, type InferSchemaType } from 'mongoose';

const TemplateSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    content: { type: String, required: true },
    icon: { type: String },
    isSystem: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TemplateSchema.index({ workspaceId: 1, title: 1 });
TemplateSchema.index({ isSystem: 1 });

export type TemplateDocument = Document & InferSchemaType<typeof TemplateSchema>;

export const TemplateModel = mongoose.model('Template', TemplateSchema);
