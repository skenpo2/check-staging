import { faker } from '@faker-js/faker';
import { Request } from 'express';
import { EventName } from './event.types';
import { logEvent } from './log-event';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log(' MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

const getUserType = () =>
  faker.helpers.arrayElement(['customer', 'expert'] as const);
const getSignupMethod = () =>
  faker.helpers.arrayElement(['email', 'google'] as const);
const getVerificationStatus = () =>
  faker.helpers.arrayElement([
    'submitted',
    'pending',
    'approved',
    'rejected',
  ] as const);
const getReviewType = () =>
  faker.helpers.arrayElement(['public', 'private', 'flagged'] as const);

//  Step 1: Generate a list of fixed users
const USERS = Array.from({ length: 50 }).map(() => ({
  id: faker.string.uuid(),
  user_type: getUserType(),
  location: faker.location.city(),
}));

const generateFakeRequest = (user: {
  id: string;
  user_type: string;
  location: string;
}): Request =>
  ({
    user: {
      id: user.id,
      user_type: user.user_type,
    },
    headers: {
      'x-user-location': user.location,
    },
  } as unknown as Request);

//  Realistic timestamp generator: within the last 30 days
const generateRecentTimestamp = () =>
  faker.date.between({ from: faker.date.recent({ days: 30 }), to: new Date() });

const dummyGenerators: { name: EventName; generate: (user: any) => any }[] = [
  {
    name: 'user_signup',
    generate: (user) => ({
      user_id: user.id,
      signup_method: getSignupMethod(),
      user_type: user.user_type,
      timestamp: generateRecentTimestamp(),
      location: user.location,
      referral_source: faker.helpers.arrayElement([
        'referral',
        'social media',
        'ads',
        'blog',
      ]),
      signup_device: faker.helpers.arrayElement(['IOS', 'Android', 'web']),
    }),
  },
  {
    name: 'identification_verification_completed',
    generate: (user) => ({
      user_id: user.id,
      user_type: user.user_type,
      verification_method: faker.helpers.arrayElement([
        'email',
        'government issued ID',
        'business registration certificate',
      ]),
      timestamp: generateRecentTimestamp(),
      id_type: faker.helpers.arrayElement([
        'NIN',
        'driver_license',
        'passport',
      ]),
      verification_status: getVerificationStatus(),
    }),
  },
  {
    name: 'profile_completed',
    generate: (user) => ({
      user_id: user.id,
      user_type: user.user_type,
      timestamp: generateRecentTimestamp(),
    }),
  },
  {
    name: 'profile_completeness_score',
    generate: (user) => ({
      user_id: user.id,
      user_type: user.user_type,
      timestamp: generateRecentTimestamp(),
      profile_fields_filled: faker.helpers.arrayElements(
        [
          'bio',
          'photo',
          'skills',
          'address',
          'languages',
          'certificates',
          'phone',
        ],
        { min: 2, max: 6 }
      ),
      completeness_score: faker.number.int({ min: 20, max: 100 }),
    }),
  },
  {
    name: 'service_listing_created',
    generate: (user) => ({
      provider_id: user.id,
      service_id: faker.string.uuid(),
      timestamp: generateRecentTimestamp(),
      service_category: faker.helpers.arrayElement([
        'home repairs',
        'legal services',
        'cleaning',
        'tech support',
      ]),
      price_range: `₦${faker.number.int({ min: 5000, max: 50000 })}`,
      location: user.location,
      service_description_length: faker.lorem.paragraph().length,
    }),
  },
  {
    name: 'search_performed',
    generate: (user) => ({
      user_id: user.id,
      user_type: user.user_type,
      timestamp: generateRecentTimestamp(),
      search_query: faker.lorem.words(3),
      filters_applied: ['price', 'location', 'availability']
        .filter(() => Math.random() > 0.4)
        .join(','),
      location: user.location,
      service_category: faker.helpers.arrayElement([
        'cleaning',
        'legal',
        'repair',
      ]),
      results_returned_count: faker.number.int({ min: 0, max: 20 }),
    }),
  },
  {
    name: 'service_viewed',
    generate: (user) => ({
      user_id: user.id,
      user_type: user.user_type,
      service_id: faker.string.uuid(),
      provider_id: faker.string.uuid(),
      timestamp: generateRecentTimestamp(),
      device_type: faker.helpers.arrayElement(['IOS', 'Android', 'web']),
    }),
  },
  {
    name: 'booking_initiated',
    generate: (user) => ({
      booking_id: faker.string.uuid(),
      customer_id: user.id,
      provider_id: faker.string.uuid(),
      service_id: faker.string.uuid(),
      timestamp: generateRecentTimestamp(),
      location: user.location,
      service_category: faker.helpers.arrayElement(['plumbing', 'home repair']),
      scheduled_date: faker.date.soon().toISOString().split('T')[0],
    }),
  },
  {
    name: 'booking_accepted',
    generate: (user) => ({
      booking_id: faker.string.uuid(),
      customer_id: faker.string.uuid(),
      provider_id: user.id,
      service_id: faker.string.uuid(),
      timestamp: generateRecentTimestamp(),
      service_category: faker.helpers.arrayElement(['cleaning', 'repair']),
      response_time: faker.number.int({ min: 1, max: 180 }),
      status: 'accepted',
    }),
  },
  {
    name: 'booking_completed',
    generate: (user) => ({
      booking_id: faker.string.uuid(),
      customer_id: faker.string.uuid(),
      provider_id: user.id,
      service_id: faker.string.uuid(),
      timestamp: generateRecentTimestamp(),
      service_category: faker.helpers.arrayElement(['cleaning', 'repair']),
      duration_from_acceptance: faker.number.int({ min: 1, max: 48 }),
      location: user.location,
    }),
  },
  {
    name: 'payment_made',
    generate: (user) => ({
      booking_id: faker.string.uuid(),
      user_id: user.id,
      service_id: faker.string.uuid(),
      amount: parseFloat(faker.finance.amount({ min: 1000, max: 100000 })),
      payment_method: faker.helpers.arrayElement([
        'bank transfer',
        'in-app wallet',
      ]),
      timestamp: generateRecentTimestamp(),
      transaction_id: faker.string.uuid(),
    }),
  },
  {
    name: 'review_submitted',
    generate: (user) => {
      const rating = faker.number.int({ min: 1, max: 5 });
      const reviewText = faker.lorem.sentences(
        faker.number.int({ min: 1, max: 3 })
      );
      return {
        review_id: faker.string.uuid(),
        customer_id: user.id,
        provider_id: faker.string.uuid(),
        booking_id: faker.string.uuid(),
        rating_score: rating,
        review_text: reviewText,
        review_text_length: reviewText.length,
        review_date: generateRecentTimestamp().toISOString().split('T')[0],
        nps_proxy:
          rating === 5
            ? 5
            : rating === 4
            ? 4
            : faker.helpers.arrayElement([1, 2, 3]),
        review_type: getReviewType(),
      };
    },
  },
];

const runSeeder = async () => {
  await connectDB();
  logger.warn(
    `🌱 Seeding 100 random entries per event using reused users...\n`
  );

  for (const { name, generate } of dummyGenerators) {
    for (let i = 0; i < 100; i++) {
      const randomUser = faker.helpers.arrayElement(USERS);
      await logEvent(
        name,
        generate(randomUser),
        generateFakeRequest(randomUser)
      );
    }
    logger.warn(`Done: ${name}`);
  }

  logger.warn(' All events seeded with random dummy data and user sessions.');
};

runSeeder();
