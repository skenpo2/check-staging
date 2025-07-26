import { Request, Response } from 'express';
import asyncHandler from '../../../middlewares/asyncHandler';
import reviewService from '../service/review.service';
import { GetAllExpertReviewsQuerySchema } from '../../user/schemas/review.schemas';

import { HTTPSTATUS } from '../../../configs/http.config';
import {
  BadRequestException,
  NotFoundException,
} from '../../../utils/appError';
import Review from '../model/review.model';
import mongoose from 'mongoose';
import { createReviewSchema } from '../../../validations/review.validations';

export const createReview = asyncHandler(
  async (req: Request, res: Response) => {
    const data = createReviewSchema.parse({ ...req.body });
    const review = await reviewService.createReview(data, req);
    res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Review submitted successfully',
    });
  }
);

export const getReviewById = asyncHandler(
  async (req: Request, res: Response) => {
    const reviewId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid Review ID');
    }

    const review = await Review.findById(reviewId).populate({
      path: 'customer',
      select: 'name email _id',
    });

    if (!review) throw new NotFoundException('Review not found');

    return res.status(HTTPSTATUS.OK).json({ success: true, review });
  }
);

export const getAllReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedQuery = GetAllExpertReviewsQuerySchema.parse({ ...req.query });
    const { page = '1', limit = '10', sort = 'desc', expert } = parsedQuery;

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    const query: any = {};

    if (!mongoose.Types.ObjectId.isValid(expert)) {
      throw new BadRequestException('Invalid expert ID');
    }
    query.expert = expert;
    const sortOrder = sort === 'asc' ? 1 : -1;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({
          createdAt: sortOrder,
          _id: sortOrder,
        })
        .skip(skip)
        .limit(pageSize)
        .select('rating review _id createdAt')
        .populate({
          path: 'customer',
          select: 'name email _id',
        }),
      Review.countDocuments(query),
    ]);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      reviews,
      total,
      page: pageNumber,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }
);
