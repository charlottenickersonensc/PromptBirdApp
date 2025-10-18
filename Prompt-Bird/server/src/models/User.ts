import mongoose, { Schema, type Document, type HookNextFunction, type InferSchemaType } from 'mongoose';

const ProviderSchema = new Schema(
  {
    type: { type: String, required: true },
    providerId: { type: String },
  },
  { _id: false }
);

const PreferencesSchema = new Schema(
  {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    defaultWorkspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
    onboardingComplete: { type: Boolean, default: false },
  },
  { _id: false }
);

const PlanSchema = new Schema(
  {
    tier: { type: String, enum: ['free', 'pro'], default: 'free' },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    emailLowercase: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    providers: { type: [ProviderSchema], default: [] },
    preferences: { type: PreferencesSchema, default: () => ({}) },
    plan: { type: PlanSchema, default: () => ({}) },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.pre('save', function preSave(this: UserDocument, next: HookNextFunction) {
  if (this.isModified('email')) {
    this.set('emailLowercase', this.get('email').toLowerCase());
  }
  next();
});

export type UserDocument = Document & InferSchemaType<typeof UserSchema>;

export const UserModel = mongoose.model('User', UserSchema);
