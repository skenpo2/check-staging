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
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expert is required'],
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
  }
);

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
