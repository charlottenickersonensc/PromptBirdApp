import mongoose, { Schema, type Document, type InferSchemaType } from 'mongoose';

const MemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'editor' },
    invitedAt: { type: Date },
    joinedAt: { type: Date },
    status: { type: String, enum: ['invited', 'active', 'left'], default: 'active' },
  },
  { _id: false }
);

const BillingSchema = new Schema(
  {
    provider: { type: String },
    customerId: { type: String },
    subscriptionId: { type: String },
    status: { type: String },
  },
  { _id: false }
);

const SettingsSchema = new Schema(
  {
    defaultTemplateIds: [{ type: Schema.Types.ObjectId, ref: 'Template' }],
    enablePublicSharing: { type: Boolean, default: false },
  },
  { _id: false }
);

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [MemberSchema], default: [] },
    billing: { type: BillingSchema, default: () => ({}) },
    settings: { type: SettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export type WorkspaceDocument = Document & InferSchemaType<typeof WorkspaceSchema>;

export const WorkspaceModel = mongoose.model('Workspace', WorkspaceSchema);
