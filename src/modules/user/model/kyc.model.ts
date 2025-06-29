import mongoose, { Document, Schema } from 'mongoose';
import {
  KycStatusEnum,
  KycStatusEnumType,
} from '../../../enums/kyc-status.enum';

/**
 * TypeScript interface describing the fields.
 */
export interface IKyc extends Document {
  // Personal Information
  name: string;
  email: string;
  dateOfBirth: Date;
  address: string;

  // Business Information
  businessName: string;
  businessAddress: string;

  // Status
  status: KycStatusEnumType;

  // File uploads
  selfieUrl: string;
  idDocumentUrl: string;
  businessDocumentUrl: string;
  otherDocumentUrl: string;
}

/**
 * Mongoose schema definition.
 */
const KycSchema = new Schema<IKyc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    businessAddress: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(KycStatusEnum),
      default: KycStatusEnum.PENDING,
      required: true,
    },
    selfieUrl: {
      type: String,
    },
    idDocumentUrl: {
      type: String,
    },
    businessDocumentUrl: {
      type: String,
    },
    otherDocumentUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const KycModel = mongoose.models.Kyc || mongoose.model<IKyc>('Kyc', KycSchema);

export default KycModel;
