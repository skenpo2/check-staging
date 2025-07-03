import express from 'express';
import { upload, uploadFile } from './upload.controllers';
import { handleKycUpload, uploadKycFiles } from './kyc-upload.controllers';

const router = express.Router();

// POST /api/upload
router.post('/listing', upload.single('file'), uploadFile);

router.post('/kyc', uploadKycFiles, handleKycUpload);

export default router;
