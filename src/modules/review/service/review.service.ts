import Review from '../model/review.model';
import Booking from '../../booking/model/booking.model';
import { NotFoundException, BadRequestException } from '../../../utils/appError';
import { IReview, IReview as IReviewSchema } from '../../user/schemas/review.schemas';
import User from '../../user/model/user.model';
import mongoose from 'mongoose';

const createReview = async (data: IReview) => {
  const booking = await Booking.findById(data.bookingId);
  if (!booking) throw new NotFoundException('Booking not found');
  if (booking.status !== 'completed') {
    throw new BadRequestException('Cannot review an incomplete booking');
  }

  const existingReview = await Review.findOne({ booking: data.bookingId });
  if (existingReview) {
    throw new BadRequestException('Review already submitted for this booking');
  }

  const review = await Review.create({
    customer: data.customerId,
    expert: data.expertId,
    service: data.serviceId,
    booking: data.bookingId,
    rating: data.rating,
    review: data.review
  });

  
  return review;
};

const getReviewsByExpert = async (expertId: string) => {
  return await Review.find({ expert: expertId }).sort({ createdAt: -1 });
};

const getReviewsByCustomer = async (customerId: string) => {
  return await Review.find({ customer: customerId }).sort({ createdAt: -1 });
};

const reviewService = {
  createReview,
  getReviewsByExpert,
  getReviewsByCustomer
};

export default reviewService;