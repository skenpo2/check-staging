import mongoose, { Schema, Document } from 'mongoose';
import { EventName } from './event.types';

export interface IEventLog extends Document {
  event: EventName;
  properties: Record<string, any>; // loosely typed to support all event shapes
  timestamp: Date;
}

const EventLogSchema = new Schema<IEventLog>(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'user_signup',
        'identification_verification_completed',
        'profile_completed',
        'profile_completeness_score',
        'service_listing_created',
        'search_performed',
        'service_viewed',
        'booking_initiated',
        'booking_accepted',
        'booking_completed',
        'payment_made',
        'review_submitted',
      ],
    },
    properties: {
      type: Schema.Types.Mixed,
      required: true,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

const EventLog = mongoose.model<IEventLog>('EventLog', EventLogSchema);

export default EventLog;
