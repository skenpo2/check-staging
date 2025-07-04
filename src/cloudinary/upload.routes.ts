import express from 'express';
import { upload, uploadFile } from './upload.controllers';
import { handleKycUpload, uploadKycFiles } from './kyc-upload.controllers';
import passport from 'passport';
import { roleGuard } from '../middlewares/roleGuard';
import { Permissions } from '../enums/user-role.enum';
import verificationCheck from '../middlewares/verificationCheck';

const router = express.Router();

// listing image upload
router.post(
  '/listing',
  passport.authenticate('jwt', { session: false }),
  verificationCheck,
  roleGuard(Permissions.EDIT_LISTING),
  upload.single('file'),
  uploadFile
);

//kyc files upload
router.post(
  '/kyc',
  passport.authenticate('jwt', { session: false }),
  roleGuard(Permissions.EDIT_PROFILE),
  uploadKycFiles,
  handleKycUpload
);

export default router;
