import mongoose, { Document, Schema } from 'mongoose';
import {
  BookingStatusEnum,
  BookingStatusEnumType,
} from '../../../enums/booking-status.enum';
import { IUser } from '../../user/model/user.model';

interface IBookingBase {
  customer: mongoose.Types.ObjectId | IUser;
  service: mongoose.Types.ObjectId;
  expert: mongoose.Types.ObjectId | IUser;
  status: BookingStatusEnumType;
  scheduledAt: Date;
  calendarEventId?: string;
}

export interface IBooking extends IBookingBase {
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  payment?: mongoose.Types.ObjectId;
  review?: mongoose.Types.ObjectId;
}

export interface IBookingDocument extends IBookingBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
      index: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expert is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatusEnum),
      default: BookingStatusEnum.PENDING,
      required: [true, 'Status is required'],
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date is required'],
      validate: {
        validator: function (date: Date) {
          return date > new Date();
        },
        message: 'Scheduled date must be in the future',
      },
    },
    calendarEventId: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create indexes for faster queries
BookingSchema.index({ customer: 1 });
BookingSchema.index({ service: 1 });
BookingSchema.index({ expert: 1 });
BookingSchema.index({ scheduledAt: 1 });
BookingSchema.index({ status: 1 });

// Define virtuals for related models
BookingSchema.virtual('payment', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'booking',
  justOne: true,
});

BookingSchema.virtual('review', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'booking',
  justOne: true,
});

// Ensure virtuals are included when converting to JSON
BookingSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.id;
    return ret;
  },
});

// BookingSchema.pre('save', function (next) {
//   if (this.isModified('status')) {
//     const validTransitions: Record<string, string[]> = {
//       PENDING: ['CONFIRMED', 'CANCELED'],
//       CONFIRMED: ['COMPLETED', 'CANCELED'],
//       CANCELED: [],
//       COMPLETED: [],
//     };

//     if (this.isNew) return next();

//     const oldStatus = this.get('status', null, {
//       getters: false,
//       virtuals: false,
//       defaults: false,
//       previous: true,
//     });
//     if (oldStatus && !validTransitions[oldStatus].includes(this.status)) {
//       return next(
//         new Error(
//           `Invalid status transition from ${oldStatus} to ${this.status}`
//         )
//       );
//     }
//   }
//   next();
// });

// Create and export the Booking model
const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
export default Booking;
