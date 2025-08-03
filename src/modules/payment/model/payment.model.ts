import mongoose, { Document, Schema, ClientSession } from 'mongoose';

export type PaymentPlatform = 'Paystack' | 'Flutterwave';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type ReleaseStatus = 'pending' | 'released' | 'disputed';

interface IPaymentBase {
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  expert: mongoose.Types.ObjectId;
  amount: number;
  platformFee?: number;
  platform: PaymentPlatform;
  status: PaymentStatus;
  transactionId?: string;
  transactionReference?: string;
  escrowReleaseDate?: Date;
  releaseStatus?: ReleaseStatus;
  notes?: string;
}

export interface IPayment extends IPaymentBase {
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentDocument extends IPaymentBase, Document {
  updateStatus(
    newStatus: PaymentStatus,
    session?: ClientSession
  ): Promise<void>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Service is required'],
      index: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expert is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    platformFee: {
      type: Number,
      min: [0, 'Platform fee cannot be negative'],
    },
    platform: {
      type: String,
      enum: {
        values: ['Paystack', 'Flutterwave'],
        message: 'Platform must be either Paystack or Flutterwave',
      },
      required: [true, 'Payment platform is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'success', 'failed', 'refunded'],
        message: 'Status must be pending, success, failed, or refunded',
      },
      default: 'pending',
      index: true,
    },
    transactionId: {
      type: String,
      trim: true,
      index: true,
    },
    transactionReference: {
      type: String,
      trim: true,
    },
    escrowReleaseDate: {
      type: Date,
    },
    releaseStatus: {
      type: String,
      enum: ['pending', 'released', 'disputed'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes must not exceed 500 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create indexes for faster queries
// PaymentSchema.index({ booking: 1 }, { unique: true }); // One payment per booking
// PaymentSchema.index({ customer: 1 });
// PaymentSchema.index({ expert: 1 });
// PaymentSchema.index({ service: 1 });
// PaymentSchema.index({ status: 1 });
// PaymentSchema.index({ createdAt: -1 }); // For sorting by date
// PaymentSchema.index({ transactionId: 1 }, { sparse: true }); // For looking up transactions

// Method to handle payment status change
PaymentSchema.methods.updateStatus = async function (
  newStatus: PaymentStatus,
  session?: mongoose.ClientSession
): Promise<void> {
  this.status = newStatus;

  if (newStatus === 'success') {
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + 7);
    this.escrowReleaseDate = releaseDate;
  }

  await this.save({ session }); //Make save part of the transaction
};

// Ensure virtuals are included when converting to JSON
PaymentSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.id;
    return ret;
  },
});

// Create and export the Payment model
const Payment = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);
export default Payment;
