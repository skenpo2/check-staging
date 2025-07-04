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
import verificationCheck from '../../middlewares/verificationCheck';

const router = express.Router();

router.get('/', getAllListings);
router.post(
  '/',
  verificationCheck,
  roleGuard(Permissions.CREATE_LISTING),
  createListing
);
router.get('/:id', getListingById);
router.put(
  '/:id',
  verificationCheck,
  roleGuard(Permissions.EDIT_LISTING),
  updateListing
);
router.delete(
  '/:id',
  verificationCheck,
  roleGuard(Permissions.DELETE_LISTING),
  deleteListing
);

export default router;
