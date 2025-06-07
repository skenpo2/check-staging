import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import bookingRoutes from '../modules/booking/booking.routes';
import { sensitiveEndpointsLimiter } from '../middlewares/rate-limiter.middleware';

const router = Router();

router.use('/auth', sensitiveEndpointsLimiter, authRoutes);
router.use('/bookings', bookingRoutes);

export default router;
