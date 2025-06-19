import mongoose, { Document, Schema, Types } from 'mongoose';
import { ICreateListing } from '../../../validations/listing.validations';

interface IListingBase {
  expert: Types.ObjectId;
  title: string;
  description: string;
  price: number;
  category?: string;
  location: string;
  availability: Date[];
  active: boolean;
}

export interface IListing extends IListingBase {
  createdAt: Date;
  updatedAt: Date;
}

export interface IListingDocument extends IListingBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListingDocument>(
  {
    expert: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expert is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [100, 'Title must not exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [1000, 'Description must not exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      max: [1000000, 'Price is too high'],
    },
    category: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    availability: {
      type: [Date],
      required: [true, 'Availability dates are required'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create indexes for faster queries
ListingSchema.index({ expert: 1 });
ListingSchema.index({ title: 'text', description: 'text' }); // Text search index
ListingSchema.index({ location: 1 });
ListingSchema.index({ price: 1 }); // For price-based filtering
ListingSchema.index({ category: 1 }); // For category-based filtering
ListingSchema.index({ active: 1 }); // For filtering active/inactive services

// Define a virtual for future booking relationship
ListingSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'listing',
});

// Virtual for average rating from reviews
ListingSchema.virtual('averageRating', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'listing',
});

// Ensure virtuals are included when converting to JSON
ListingSchema.set('toJSON', {
  virtuals: true,
  transform: (
    doc: mongoose.Document,
    ret: Record<string, any>,
    options: any
  ) => {
    delete ret.id;
    return ret;
  },
});

const Listing = mongoose.model<IListingDocument>('Listing', ListingSchema);
export default Listing;
