import { Router } from 'express';
import { createReview, getReviewById, getAllReviews } from '../controller/review.controller';


const router = Router();

router.post('/', createReview);      
router.get('/:reviewId', getReviewById); // getReviewById
router.get('/', getAllReviews); // getAllReviews, filter by expert (expert as query param)

export default router;