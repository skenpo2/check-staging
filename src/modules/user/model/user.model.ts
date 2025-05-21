import mongoose, { Document, Schema } from 'mongoose';
import argon2 from 'argon2';

// Import the Zod schema types
import { IKYCData, IUser as IUserSchema } from '../schemas/user.schema';

// Interface for KYC data in the MongoDB document
export interface IKYC extends IKYCData {}

// Interface for User MongoDB document - extends the Zod user schema type
export interface IUser extends Omit<IUserSchema, 'kyc'>, Document {
  kyc?: IKYC;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// KYC Schema for MongoDB
const KYCSchema = new Schema<IKYC>({
  idType: { type: String, required: true },
  idNumber: { type: String, required: true },
  idImageUrl: { type: String, required: true },
});

// User Schema for MongoDB
const UserSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: [true, 'Name is required'],
      trim: true
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'], 
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: { 
      type: String, 
      required: [true, 'Password is required']
    },
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true
    },
    role: { 
      type: String, 
      enum: ['customer', 'expert'], 
      required: [true, 'Role is required'],
      default: 'customer'
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    kyc: { 
      type: KYCSchema, 
      required: false 
    }
  },
  {
    timestamps: true, 
    versionKey: false 
  }
);

// Create indexes for faster queries
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 });

// 🔐 Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await argon2.hash(this.password);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// 🔍 Compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await argon2.verify(this.password, candidatePassword);
};

// Create and export the User model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;
