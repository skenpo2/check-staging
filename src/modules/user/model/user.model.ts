import mongoose, { Document, Schema } from 'mongoose';
import argon2 from 'argon2';

// Import the Zod schema types
import { IKYCData, IUser as IUserSchema } from '../schemas/user.schema';
import {
  ProviderEnum,
  ProviderEnumType,
} from '../../../enums/account-provider.enum';
import { RoleEnum } from '../../../enums/user-role.enum';

// Interface for KYC data in the MongoDB document
export interface IKYC extends IKYCData {}

export interface IAccount extends Document {
  provider: ProviderEnumType;
  providerId: string; // Store the email, googleId, facebookId as the providerId
  googleAccessToken: string;
  googleRefreshToken: string;
}

// Interface for User MongoDB document - extends the Zod user schema type
export interface IUser extends Omit<IUserSchema, 'kyc'>, Document {
  profilePicture?: String;
  kyc?: IKYC;
  account: IAccount;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  omitPassword(): Omit<IUser, 'password'>;
}

// KYC Schema for MongoDB
const KYCSchema = new Schema<IKYC>({
  idType: { type: String, required: true },
  idNumber: { type: String, required: true },
  idImageUrl: { type: String, required: true },
});

const AccountSchema = new Schema<IAccount>({
  provider: {
    type: String,
    enum: Object.values(ProviderEnum),
    required: true,
  },
  providerId: {
    type: String,
    required: true,
    unique: true,
  },
  googleAccessToken: String,
  googleRefreshToken: String,
});

// User Schema for MongoDB
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(RoleEnum),
      required: [true, 'Role is required'],
    },
    profilePicture: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    account: {
      type: AccountSchema,
      required: true,
    },
    kyc: {
      type: KYCSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// // Create indexes for faster queries
// UserSchema.index({ email: 1 }, { unique: true });
// UserSchema.index({ phone: 1 });

// Compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await argon2.verify(this.password, candidatePassword);
};

UserSchema.methods.omitPassword = function (): Omit<IUser, 'password'> {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};
// Create and export the User model
const UserModel = mongoose.model<IUser>('User', UserSchema);
export default UserModel;
