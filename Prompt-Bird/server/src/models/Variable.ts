import mongoose, { Schema, type Document, type HookNextFunction, type InferSchemaType } from 'mongoose';

const VariableSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    nameLowercase: { type: String, required: true },
    type: { type: String, enum: ['string', 'number', 'code'], default: 'string' },
    value: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

VariableSchema.index({ workspaceId: 1, nameLowercase: 1 }, { unique: true });

VariableSchema.pre('validate', function preValidate(this: VariableDocument, next: HookNextFunction) {
  const name: unknown = this.get('name');
  if (typeof name === 'string') {
    this.set('nameLowercase', name.toLowerCase());
  }
  next();
});

export type VariableDocument = Document & InferSchemaType<typeof VariableSchema>;

export const VariableModel = mongoose.model('Variable', VariableSchema);
