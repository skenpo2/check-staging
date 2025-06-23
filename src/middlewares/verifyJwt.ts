// middlewares/jwtAuth.middleware.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import UserModel from '../modules/user/model/user.model';
import { config } from '../configs/app.config';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  console.log(token);

  try {
    const decoded: any = jwt.verify(token, config.ACCESS_TOKEN);

    const userId = decoded?.user?.id;
    const userRole = decoded?.user?.role;

    if (!userId || !userRole) {
      res
        .status(401)
        .json({ success: false, message: 'Invalid token structure' });
      return;
    }

    const user = await UserModel.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }
};
