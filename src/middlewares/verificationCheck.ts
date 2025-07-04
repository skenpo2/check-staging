import { NextFunction, Request, Response } from 'express';
import { UnauthorizedException } from '../utils/appError';

export default function verificationCheck(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.isVerified === false) {
    throw new UnauthorizedException(
      'You are not allowed to perform this operation'
    );
  }
  next();
}
