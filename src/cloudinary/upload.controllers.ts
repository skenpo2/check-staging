import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import cloudinary from './cloudinary.config';
import { BadRequestException } from '../utils/appError';
import { HTTPSTATUS } from '../configs/http.config';
import AsyncHandler from '../middlewares/asyncHandler';

// Configure Multer memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

export const uploadFile = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new BadRequestException('No file provided');
    }

    const buffer = req.file.buffer;

    // Upload to Cloudinary using stream
    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image' },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Upload failed'));
            } else {
              resolve(result);
            }
          }
        );
        Readable.from(buffer).pipe(stream);
      }
    );

    return res
      .status(HTTPSTATUS.OK)
      .json({ success: true, url: result.secure_url });
  }
);
