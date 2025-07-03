import { Request, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import cloudinary from './cloudinary.config';
import { HTTPSTATUS } from '../configs/http.config';
import AsyncHandler from '../middlewares/asyncHandler';

// Multer config for multiple files (up to 5 files)
export const uploadKycFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype.startsWith('image/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed.'));
    }
  },
}).array('files', 5); // Expecting form-data key "files"

export const handleKycUpload = AsyncHandler(
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    const userId = req.user?._id; // Adjust as needed
    if (!userId) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ error: 'User ID is required.' });
    }

    if (!files || files.length === 0) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ error: 'No files provided.' });
    }

    const uploadResults = await Promise.all(
      files.map(
        (file, index) =>
          new Promise<{ url: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                resource_type:
                  file.mimetype === 'application/pdf' ? 'raw' : 'image',
                folder: `kyc_docs/${userId}`,
                public_id: `document_${Date.now()}_${index}`,
              },
              (error, result) => {
                if (error || !result) {
                  reject(error || new Error('Upload failed.'));
                } else {
                  resolve({ url: result.secure_url });
                }
              }
            );

            Readable.from(file.buffer).pipe(stream);
          })
      )
    );

    return res.status(HTTPSTATUS.OK).json({
      message: 'Files uploaded successfully.',
      files: uploadResults,
    });
  }
);
