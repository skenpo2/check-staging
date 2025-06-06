import mongoose from 'mongoose';
import { BookingStatusEnum } from '../../enums/booking-status.enum';
import Booking, { IBookingDocument } from './model/booking.model';
import { BadRequestException, NotFoundException } from '../../utils/appError';
import { IBooking } from '../../validations/booking.validations';
import Service from '../service/model/service.model';

export const createBookingService = async (body: IBooking) => {
  try {
    const { customer, service, expert, scheduledAt } = body;

    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(customer) ||
      !mongoose.Types.ObjectId.isValid(service) ||
      !mongoose.Types.ObjectId.isValid(expert)
    ) {
      throw new BadRequestException('Invalid ObjectId(s)');
    }

    // Validate date
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      throw new BadRequestException(
        'Scheduled date must be a valid future date'
      );
    }

    const isExistingService = await Service.findById(service);

    if (!isExistingService) {
      throw new NotFoundException('Service does not exist');
    }

    const newBooking = await Booking.create({
      customer,
      service,
      expert,
      scheduledAt,
      status: BookingStatusEnum.PENDING,
    });

    return newBooking;
  } catch (error) {
    throw error;
  }
};

export const bookingCalenderService = async (booking: IBookingDocument) => {
  const expert = booking.expert;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
  );

  oauth2Client.setCredentials({
    access_token: expert.accessToken,
    refresh_token: expert.refreshToken,
  });

  const event = {
    summary: `Service Booking: ${booking.service}`,
    start: {
      dateTime: booking.scheduledAt.toISOString(),
      timeZone: 'Africa/Lagos',
    },
    end: {
      dateTime: new Date(
        booking.scheduledAt.getTime() + 60 * 60 * 1000
      ).toISOString(),
      timeZone: 'Africa/Lagos',
    },
  };

  const { data } = await calendar.events.insert({
    calendarId: 'primary',
    auth: oauth2Client,
    requestBody: event,
  });
};
