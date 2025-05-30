import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import { sensitiveEndpointsLimiter } from '../middlewares/rate-limiter.middleware';

const router = Router();

router.use('/auth', sensitiveEndpointsLimiter, authRoutes);

export default router;
