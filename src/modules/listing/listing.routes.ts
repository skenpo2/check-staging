import express from 'express';
import {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
} from './listing.controller';

const router = express.Router();

router.get('/', getAllListings);
router.post('/', createListing);
router.get('/:id', getListingById);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);

export default router;
