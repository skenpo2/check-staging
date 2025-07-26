import Review from '../model/review.model';
import Booking from '../../booking/model/booking.model';
import {
  NotFoundException,
  BadRequestException,
} from '../../../utils/appError';
import { ICreateReviewSchema } from '../../../validations/review.validations';
import { Request } from 'express';

const createReview = async (data: ICreateReviewSchema, req: Request) => {
  const booking = await Booking.findOne({
    _id: data.bookingId,
    customer: req.user?._id,
  });
  if (!booking) throw new NotFoundException('Booking not found');
  if (booking.status !== 'COMPLETED') {
    throw new BadRequestException('Cannot review an incomplete booking');
  }

  const existingReview = await Review.findOne({ booking: data.bookingId });
  if (existingReview) {
    throw new BadRequestException('Review already submitted for this booking');
  }

  const review = new Review({
    customer: booking.customer,
    expert: booking.expert,
    listing: booking.listing,
    booking: booking._id,
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
