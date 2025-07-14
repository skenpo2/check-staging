import { Router } from 'express';
import {
  createReview,
  getReviewById,
  getAllReviews,
} from '../controller/review.controller';
import passport from '../../../configs/passport.config';
import { roleGuard } from '../../../middlewares/roleGuard';
import { Permissions } from '../../../enums/user-role.enum';

const router = Router();

router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.RATE_EXPERT),
  createReview
);
router.get('/:id', getReviewById);
router.get('/', getAllReviews);

export default router;
