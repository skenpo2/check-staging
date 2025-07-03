import express from 'express';
import {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
} from './listing.controller';
import { roleGuard } from '../../middlewares/roleGuard';
import { Permissions } from '../../enums/user-role.enum';

const router = express.Router();

router.get('/', getAllListings);
router.post('/', roleGuard(Permissions.CREATE_LISTING), createListing);
router.get('/:id', getListingById);
router.put('/:id', roleGuard(Permissions.EDIT_LISTING), updateListing);
router.delete('/:id', roleGuard(Permissions.DELETE_LISTING), deleteListing);

export default router;
