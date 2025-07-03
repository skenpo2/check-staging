import { Request, Response } from 'express';
import asyncHandler from '../../../middlewares/asyncHandler';
import reviewService from '../service/review.service';
import { ReviewSchema } from '../../user/schemas/review.schemas';
import { createReviewSchema } from '../../../validations/review.validations';

import { HTTPSTATUS } from '../../../configs/http.config';
import {
  NotFoundException,
  UnauthorizedException,
} from '../../../utils/appError';
import Review from '../model/review.model';
import User from '../../user/model/user.model';

export const createReview = asyncHandler(
  async (req: Request, res: Response) => {
    const data = createReviewSchema.parse({ ...req.body });
    const review = await reviewService.createReview(data);
    res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  }
);

export const getReviewById = asyncHandler(
  async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) throw new NotFoundException('Review not found');

    res.status(HTTPSTATUS.OK).json({ success: true, data: review });
  }
);

export const getAllReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { expert } = req.query;

    const filters: any = {};
    if (expert) {
      const expertExists = await User.findById(expert);
      if (!expertExists) {
        throw new NotFoundException('Expert not found');
      }
      filters.expert = expert;
    }

    const reviews = await Review.find(filters).sort({ createdAt: -1 });

    res.status(HTTPSTATUS.OK).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  }
);
