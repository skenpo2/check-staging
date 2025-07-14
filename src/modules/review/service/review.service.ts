import Review from '../model/review.model';
import Booking from '../../booking/model/booking.model';
import {
  NotFoundException,
  BadRequestException,
} from '../../../utils/appError';
import {
  IReview,
  IReview as IReviewSchema,
} from '../../user/schemas/review.schemas';

const createReview = async (data: IReview) => {
  const booking = await Booking.findById(data.bookingId);
  if (!booking) throw new NotFoundException('Booking not found');
  if (booking.status !== 'COMPLETED') {
    throw new BadRequestException('Cannot review an incomplete booking');
  }

  const existingReview = await Review.findOne({ booking: data.bookingId });
  if (existingReview) {
    throw new BadRequestException('Review already submitted for this booking');
  }

  const review = new Review({
    customer: data.customerId,
    expert: data.expertId,
    service: data.listingId,
    booking: data.bookingId,
    rating: data.rating,
    review: data.review,
  });

  await review.save();
  return review;
};

const reviewService = {
  createReview,
};

export default reviewService;
