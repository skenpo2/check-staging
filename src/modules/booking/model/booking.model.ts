import mongoose, { Document, Schema } from 'mongoose';
import {
  BookingStatusEnum,
  BookingStatusEnumType,
} from '../../../enums/booking-status.enum';
import { IUser } from '../../user/model/user.model';

interface IBookingBase {
  customer: mongoose.Types.ObjectId | IUser;
  listing: mongoose.Types.ObjectId;
  expert: mongoose.Types.ObjectId | IUser;
  status: BookingStatusEnumType;
  location: string;
  price: number;
  platformFee: number;
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
    },
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing is required'],
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expert is required'],
    },

    location: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatusEnum),
      default: BookingStatusEnum.PENDING,
      required: [true, 'Status is required'],
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [10000, 'Minimum price is ₦10,000'],
      max: [999999, 'Maximum price is ₦999,999'],
    },

    platformFee: {
      type: Number,
      default: 0, // will be updated before save
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
  }
);

BookingSchema.pre('save', function (next) {
  // Set platformFee to 10% of price
  this.platformFee = Math.round(this.price * 0.1);
  next();
});

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
