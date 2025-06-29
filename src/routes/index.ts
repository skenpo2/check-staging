import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import bookingRoutes from '../modules/booking/booking.routes';
import listingRoutes from '../modules/listing/listing.routes';
import paymentRoutes from '../modules/payment/payment.routes';
import kycRoutes from '../modules/user/user.kyc.routes';
import { sensitiveEndpointsLimiter } from '../middlewares/rate-limiter.middleware';

const router = Router();

router.use('/auth', sensitiveEndpointsLimiter, authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/listings', listingRoutes);
router.use('payment', paymentRoutes);
router.use('user/kyc', kycRoutes);

export default router;
