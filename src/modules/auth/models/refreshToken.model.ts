import mongoose, { Document, Schema } from 'mongoose';

export interface RefreshDocument extends Document {
  token: string;
  user: mongoose.Types.ObjectId;
  device?: string;
  ip?: string;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema<RefreshDocument>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    device: String,
    ip: String,
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const RefreshTokenModel = mongoose.model<RefreshDocument>(
  'RefreshToken',
  refreshTokenSchema
);

export default RefreshTokenModel;
