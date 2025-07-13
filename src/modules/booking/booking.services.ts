import mongoose from 'mongoose';
import {
  BookingStatusEnum,
  BookingStatusEnumType,
} from '../../enums/booking-status.enum';
import Booking from './model/booking.model';
import { BadRequestException, NotFoundException } from '../../utils/appError';
import { IBooking } from '../../validations/booking.validations';
import Listing from '../listing/model/listing.model';
import {
  ListingAvailabilityEnum,
  ListingStatusEnum,
} from '../../enums/listing-enum';

export const createBookingService = async (body: IBooking) => {
  try {
    const { customer, listing, note, location, scheduledAt } = body;

    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(customer as string) ||
      !mongoose.Types.ObjectId.isValid(listing)
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
    // Build query
    const query: any = {
      _id: listing,
      status: ListingStatusEnum.PUBLISHED,
      availability: ListingAvailabilityEnum.AVAILABLE,
    };

    const isExistingService = await Listing.findOne(query);

    if (!isExistingService) {
      throw new NotFoundException('Listing does not exist');
    }

    const newBooking = await Booking.create({
      customer: customer,
      listing: listing,
      expert: isExistingService.expert,
      note: note,
      location: location,
      scheduledAt: scheduledAt,
      status: BookingStatusEnum.PENDING,
      price: isExistingService.price,
    });

    return newBooking;
  } catch (error) {
    throw error;
  }
};

export function validateBookingStatusTransition(
  currentStatus: BookingStatusEnumType,
  nextStatus: BookingStatusEnumType
) {
  const validTransitions: Record<
    BookingStatusEnumType,
    BookingStatusEnumType[]
  > = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PAID'],
    PAID: ['DONE'],
    DONE: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: ['CONFIRMED'],
  };

  const allowed = validTransitions[currentStatus];

  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Invalid booking status transition from '${currentStatus}' to '${nextStatus}'.`
    );
  }
}
