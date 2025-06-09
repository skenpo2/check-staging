import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import bookingRoutes from '../modules/booking/booking.routes';
import listingRoutes from '../modules/listing/listing.routes';
import { sensitiveEndpointsLimiter } from '../middlewares/rate-limiter.middleware';

const router = Router();

router.use('/auth', sensitiveEndpointsLimiter, authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/listings', listingRoutes);

export default router;
