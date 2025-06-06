import { Request, Response, NextFunction } from 'express';

import { google } from 'googleapis';

import AsyncHandler from '../../middlewares/asyncHandler';
import {
  BookingStatusEnum,
  BookingStatusEnumType,
} from '../../enums/booking-status.enum';
import Booking from './model/booking.model';
import mongoose from 'mongoose';
import { BadRequestException, NotFoundException } from '../../utils/appError';
import { HTTPSTATUS } from '../../configs/http.config';
import { createBookingService } from './booking.services';
import { BookingSchema } from '../../validations/booking.validations';
import { IUser } from '../user/model/user.model';
import { config } from '../../configs/app.config';

//Google calender setup
const calendar = google.calendar('v3');

export const createBookingController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = BookingSchema.parse({ ...req.body });

    const booking = await createBookingService(body);

    // later we will send email notification to the customer and the expert

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Booking Created',
      booking,
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
      throw new BadRequestException('Invalid or missing user ID');
    }

    // Pagination setup
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Build query
    const query: any = {
      $or: [{ customer: user }, { expert: user }],
    };

    // Optional status filter
    if (status && typeof status === 'string') {
      const allowedStatuses = Object.values(BookingStatusEnum);
      if (!allowedStatuses.includes(status as BookingStatusEnumType)) {
        throw new BadRequestException('Invalid status');
      }
      query.status = status;
    }

    // Sorting: 'desc' or 'asc' on scheduledAt
    const sortOrder = sort === 'asc' ? 1 : -1;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer expert service')
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
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'expert',
        select: 'name email _id',
      })
      .populate({
        path: 'customer',
        select: 'name email _id',
      });

    if (!booking) {
      throw new NotFoundException('Booking does not exist');
    }

    res.status(HTTPSTATUS.OK).json({
      success: true,
      booking,
    });
  }
);

export const updateBookingByIdController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookingId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'expert',
        select: 'name email account',
      })
      .populate({
        path: 'customer',
        select: 'name email',
      });

    if (!booking) {
      throw new NotFoundException('Booking does not exist');
    }

    booking.status = status;
    await booking.save();
    //Add the booking to the expert calender
    if (status === 'CONFIRMED') {
      const expert = booking.expert as IUser;
      const customer = booking.customer as IUser;

      const accessToken = expert.account.googleAccessToken;
      const refreshToken = expert.account.googleRefreshToken;

      const oauth2Client = new google.auth.OAuth2(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        config.GOOGLE_CALLBACK_URL
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const event = {
        summary: `Service Booking: ${booking.service}`,
        description: `Appointment between ${expert.name} and ${customer.name}`,
        start: {
          dateTime: booking.scheduledAt.toISOString(),
          timeZone: 'Africa/Lagos',
        },
        end: {
          dateTime: new Date(
            booking.scheduledAt.getTime() + 300 * 60 * 1000
          ).toISOString(),
          timeZone: 'Africa/Lagos',
        },
        attendees: [{ email: expert.email }, { email: customer.email }],
        reminders: {
          useDefault: true,
        },
      };

      const { data } = await calendar.events.insert({
        calendarId: 'primary',
        auth: oauth2Client,
        requestBody: event,
        sendUpdates: 'all', // Sends email to all attendees
      });

      booking.calendarEventId = data.id as string;
      await booking.save();
    }

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Booking updated successfully',
      booking,
    });
  }
);
