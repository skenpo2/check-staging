import { Router } from 'express';
// import authRoutes from '../modules/auth/auth.routes';
// import userRoutes from '../modules/user/user.routes';
// import expertRoutes from '../modules/expert/expert.routes';
import reviewRoutes from '../modules/review/routes/review.routes';


// Import other routes...

const router = Router();

// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/experts', expertRoutes);
router.use('/reviews', reviewRoutes);
// Add other module routes...

export default router;
