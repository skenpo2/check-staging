import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import bookingRoutes from '../modules/booking/booking.routes';
import paymentRoutes from '../modules/payment/payment.routes';
import listingRoutes from '../modules/listing/listing.routes';
import reviewRoutes from '../modules/review/routes/review.routes';

import uploadRoutes from '../cloudinary/upload.routes';
import dashboardAnalytics from '../modules/user/user.dashboard-analytics.routes';

import kycRoutes from '../modules/user/user.kyc.routes';
import { sensitiveEndpointsLimiter } from '../middlewares/rate-limiter.middleware';

import messageRoutes from '../modules/messages/messages.routes';

const router = Router();

router.use('/auth', sensitiveEndpointsLimiter, authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/listings', listingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);
router.use('/user/kyc', kycRoutes);
router.use('/user/analytics', dashboardAnalytics);
router.use('/upload', uploadRoutes);

router.use('/messages', messageRoutes);

export default router;
