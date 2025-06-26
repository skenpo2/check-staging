import { Request, Response, NextFunction } from 'express';
import AsyncHandler from '../../middlewares/asyncHandler';
import { HTTPSTATUS } from '../../configs/http.config';
import Listing from './model/listing.model';
import mongoose from 'mongoose';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '../../utils/appError';
import {
  CreateListingSchema,
  UpdateListingSchema,
} from '../../validations/listing.validations';

/**
 * Create a new listing
 * @route POST /api/listings
 */
export const createListing = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // In the future, this endpoint will be restricted to experts only
    // if (req.user?.role !== 'EXPERT') {
    //   throw new UnauthorizedException('Only experts can create listings');
    // }

    const body = CreateListingSchema.parse({ ...req.body });

    const newListing = new Listing(body);
    await newListing.save();

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Listing created successfully',
      listing: newListing,
    });
  }
);

export const getAllListings = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      page = '1',
      limit = '10',
      sort = 'desc',
      expertId,
      minPrice,
      maxPrice,
      category,
      location,
      active,
      search,
    } = req.query;

    // Pagination setup
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Build query
    const query: any = {};

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price['$gte'] = parseFloat(minPrice as string);
      if (maxPrice) query.price['$lte'] = parseFloat(maxPrice as string);
    }

    if (category) {
      query.category = category;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (active !== undefined) {
      query.active = active === 'true';
    }

    if (search) {
      query['$text'] = { $search: search as string };
    }

    if (expertId) {
      query.expert = expertId;
    }
    const sortOrder = sort === 'asc' ? 1 : -1;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .populate({
          path: 'expert',
          select: 'name email _id',
        }),
      Listing.countDocuments(query),
    ]);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      listings,
      total,
      page: pageNumber,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }
);

export const getListingById = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid listing ID');
    }

    const listing = await Listing.findById(id).populate({
      path: 'expert',
      select: 'name email _id',
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      listing,
    });
  }
);

export const updateListing = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const currentUserId = req.user?._id;

    //In the future, this endpoint will be restricted to the expert who owns the listing
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.expert.toString() !== currentUserId) {
      throw new UnauthorizedException(
        'You are not authorized to update this listing'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid listing ID');
    }

    const updateData = UpdateListingSchema.parse({ ...req.body });

    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedListing) {
      throw new NotFoundException('Listing not found');
    }

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Listing updated successfully',
      listing: updatedListing,
    });
  }
);

export const deleteListing = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const currentUserId = req.user?._id;

    // In the future, this endpoint will be restricted to the expert who owns the listing
    // const listing = await Service.findById(id);
    // if (!listing) {
    //   throw new NotFoundException('Listing not found');
    // }
    // if (listing.expert.toString() !== currentUserId) {
    //   throw new UnauthorizedException('You are not authorized to delete this listing');
    // }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid listing ID');
    }

    const deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
      throw new NotFoundException('Listing not found');
    }

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Listing deleted successfully',
    });
  }
);

//get expert last five listings  for analytic dashboard
export const getLastFiveListingByExpertId = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const listings = await Listing.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(HTTPSTATUS.OK).json({
      latestListings: listings,
    });
  }
);
