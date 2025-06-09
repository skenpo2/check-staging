import express from 'express';
import {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing
} from './listing.controller';

const router = express.Router();

router.get('/listings', getAllListings);
router.post('/listings', createListing);
router.get('/listings/:id', getListingById);
router.put('/listings/:id', updateListing);
router.delete('/listings/:id', deleteListing);

export default router;
