import mongoose, { Document, Schema } from 'mongoose';

// TODO: If a Zod schema exists for Review, import it like:
// import { IReview as IReviewSchema } from '../schemas/review.schema';

interface IReviewBase {
  customer: mongoose.Types.ObjectId;
  expert: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  rating: number;
  review?: string;
}

export interface IReview extends IReviewBase {
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewDocument extends IReviewBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

interface IReviewModel extends mongoose.Model<IReviewDocument> {
  getAverageRating(expertId: mongoose.Types.ObjectId): Promise<number>;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expert is required'],
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
      index: true,
      unique: true, // One review per booking
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      required: [true, 'Rating is required'],
    },
    review: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review must not exceed 1000 characters'],
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    versionKey: false, // Don't include __v field
  }
);

// Ensure the model is properly initialized before allowing retrieval
ReviewSchema.pre('find', function () {
  this.populate('customer', 'name');
  this.populate('expert', 'name');
});

// Static method to get average rating for an expert
ReviewSchema.statics.getAverageRating = async function (
  expertId: mongoose.Types.ObjectId
): Promise<number> {
  const result = await this.aggregate([
    { $match: { expert: expertId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
  return result.length > 0 ? Number(result[0].averageRating.toFixed(1)) : 0;
};

// Ensure virtuals are included when converting to JSON
ReviewSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.id;
    return ret;
  },
});

ReviewSchema.virtual('formattedRating').get(function () {
  return `${this.rating.toFixed(1)} ⭐`;
});

// Create and export the Review model
const Review = mongoose.model<IReviewDocument, IReviewModel>(
  'Review',
  ReviewSchema
);
export default Review;
