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
import passport from '../../configs/passport.config';

const router = express.Router();

router.get('/', getAllListings);
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  verificationCheck,
  roleGuard(Permissions.CREATE_LISTING),
  createListing
);
router.get('/:id', getListingById);
router.put(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  verificationCheck,
  roleGuard(Permissions.EDIT_LISTING),
  updateListing
);
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  verificationCheck,
  roleGuard(Permissions.DELETE_LISTING),
  deleteListing
);

export default router;
