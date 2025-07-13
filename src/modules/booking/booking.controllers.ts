import { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';

import AsyncHandler from '../../middlewares/asyncHandler';
import {
  allowedForCustomer,
  allowedForExpert,
  BookingStatusEnum,
  BookingStatusEnumType,
} from '../../enums/booking-status.enum';
import Booking from './model/booking.model';
import mongoose from 'mongoose';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '../../utils/appError';
import { HTTPSTATUS } from '../../configs/http.config';
import {
  createBookingService,
  validateBookingStatusTransition,
} from './booking.services';
import { BookingSchema } from '../../validations/booking.validations';

//Google calender setup
// const calendar = google.calendar('v3');

export const createBookingController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = BookingSchema.parse({ ...req.body });

    const {
      customer,
      listing,
      expert,
      note,
      location,
      scheduledAt,
      status,
      price,
    } = await createBookingService({ ...body, customer: req.user?._id });

    // later we will send email notification to the customer and the expert

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Booking Created',
      booking: {
        customer,
        listing,
        expert,
        note,
        location,
        scheduledAt,
        status,
        price,
      },
    });
  }
);

export const getAllBookingController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, status, page = '1', limit = '10', sort = 'desc' } = req.query;

    // Validate `user` param
    if (
      !user ||
      typeof user !== 'string' ||
      !mongoose.Types.ObjectId.isValid(user)
    ) {
      throw new BadRequestException('Invalid user or missing user ID');
    }

    // Pagination setup
    const pageNumber = parseInt(page as string, 10) || 1;
    const pageSize = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Determine user role
    const userRole = req.user?.role;

    // Build query dynamically
    const query: any = {};

    if (userRole === 'CUSTOMER') {
      query.customer = user.toString();
    } else {
      query.expert = user.toString();
    }

    // Optional status filter
    if (status && typeof status === 'string') {
      const allowedStatuses = Object.values(BookingStatusEnum);
      if (!allowedStatuses.includes(status as BookingStatusEnumType)) {
        throw new BadRequestException('Invalid status');
      }
      query.status = status;
    }

    // Sorting
    const sortOrder = sort === 'asc' ? 1 : -1;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate([
          {
            //select only name and id
            path: 'customer',
            select: 'name _id',
          },
          {
            path: 'expert',
            // select only name and id
            select: 'name _id',
          },
          {
            path: 'listing',
            //select only title and _id
            select: 'title _id',
          },
        ])
        .sort({ scheduledAt: sortOrder })
        .skip(skip)
        .limit(pageSize),
      Booking.countDocuments(query),
    ]);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      bookings,
      total,
      page: pageNumber,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }
);

export const getBookingByIDController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const bookingId = req.params.id;
    const userRole = req.user?.role;
    const userId = req.user?._id;

    // Validate bookingId
    if (!bookingId || typeof bookingId !== 'string') {
      throw new BadRequestException('Invalid booking ID');
    }

    console.log(bookingId);

    if (!userRole || !userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    // Build query
    const query: any = { _id: bookingId };

    if (userRole === 'CUSTOMER') {
      query.customer = userId;
    } else if (userRole === 'EXPERT') {
      query.expert = userId;
    } else {
      throw new UnauthorizedException('Invalid role');
    }

    const booking = await Booking.findOne(query)
      .populate({
        path: 'expert',
        select: 'name email _id',
      })
      .populate([
        {
          //select only name and id
          path: 'customer',
          select: 'name _id',
        },
        {
          path: 'expert',
          // select only name and id
          select: 'name _id',
        },
        {
          path: 'listing',
          //select only title and _id
          select: 'title _id',
        },
      ]);

    if (!booking) {
      throw new NotFoundException('Booking does not exist');
    }

    res.status(HTTPSTATUS.OK).json({
      success: true,
      booking,
    });
  }
);

export const updateBookingByCustomerController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const bookingId = req.params.id;
    const status = req.body.status;
    const userRole = req.user?.role;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid booking ID');
    }

    if (!userRole || !userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    // Build query
    const query: any = { _id: bookingId };

    if (userRole === 'CUSTOMER') {
      query.customer = userId;
    } else {
      throw new UnauthorizedException('Invalid role');
    }

    if (!status || !allowedForCustomer.includes(status)) {
      throw new UnauthorizedException('Not allowed to perform this operation');
    }

    const booking = await Booking.findOne(query).populate([
      {
        //select only name and id
        path: 'customer',
        select: 'name _id',
      },
      {
        path: 'expert',
        // select only name and id
        select: 'name _id',
      },
      {
        path: 'listing',
        //select only title and _id
        select: 'title _id',
      },
    ]);

    if (!booking) {
      throw new NotFoundException('Booking does not exist');
    }
    const currentStatus = booking.status;

    // Validate status transition
    validateBookingStatusTransition(currentStatus, status);

    booking.status = status;
    await booking.save();

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Booking updated successfully',
      booking,
    });
  }
);

export const updateBookingByExpertController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const bookingId = req.params.id;
    const status = req.body?.status;
    const userRole = req.user?.role;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid booking ID');
    }

    if (!userRole || !userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    // Build query
    const query: any = { _id: bookingId };

    if (userRole === 'EXPERT') {
      query.expert = userId;
    } else {
      throw new UnauthorizedException('Invalid role');
    }

    if (!status || !allowedForExpert.includes(status)) {
      throw new UnauthorizedException('Not allowed to perform this operation');
    }

    const booking = await Booking.findOne(query).populate([
      {
        //select only name and id
        path: 'customer',
        select: 'name _id',
      },
      {
        path: 'expert',
        // select only name and id
        select: 'name _id',
      },
      {
        path: 'listing',
        //select only title and _id
        select: 'title _id',
      },
    ]);

    if (!booking) {
      throw new NotFoundException('Booking does not exist');
    }
    const currentStatus = booking.status;

    // Validate status transition
    validateBookingStatusTransition(currentStatus, status);

    booking.status = status;
    await booking.save();

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Booking updated successfully',
      booking,
    });
  }
);

export const deleteBookingByIdController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookingId } = req.params;
    const currentUserId = req.user?._id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customer.toString() !== currentUserId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this booking'
      );
    }
    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        'Only bookings with status PENDING can be deleted'
      );
    }

    await booking.deleteOne();

    return res
      .status(HTTPSTATUS.OK)
      .json({ success: true, message: 'Booking deleted successfully' });
  }
);

//Add the booking to the expert calender
// if (status === 'CONFIRMED') {
//   const expert = booking.expert as IUser;
//   const customer = booking.customer as IUser;

//   const accessToken = expert.account.googleAccessToken;
//   const refreshToken = expert.account.googleRefreshToken;

//   const oauth2Client = new google.auth.OAuth2(
//     config.GOOGLE_CLIENT_ID,
//     config.GOOGLE_CLIENT_SECRET,
//     config.GOOGLE_CALLBACK_URL
//   );

//   oauth2Client.setCredentials({
//     access_token: accessToken,
//     refresh_token: refreshToken,
//   });

//   const event = {
//     summary: `Service Booking: ${booking.service}`,
//     description: `Appointment between ${expert.name} and ${customer.name}`,
//     start: {
//       dateTime: booking.scheduledAt.toISOString(),
//       timeZone: 'Africa/Lagos',
//     },
//     end: {
//       dateTime: new Date(
//         booking.scheduledAt.getTime() + 300 * 60 * 1000
//       ).toISOString(),
//       timeZone: 'Africa/Lagos',
//     },
//     attendees: [{ email: expert.email }, { email: customer.email }],
//     reminders: {
//       useDefault: false,
//       overrides: [
//         { method: 'email', minutes: 30 },
//         { method: 'popup', minutes: 10 },
//       ],
//     },
//   };

//   const { data } = await calendar.events.insert({
//     calendarId: 'primary',
//     auth: oauth2Client,
//     requestBody: event,
//     sendUpdates: 'all', // Sends email to all attendees
//   });

//   booking.calendarEventId = data.id as string;
//   await booking.save();
// }
