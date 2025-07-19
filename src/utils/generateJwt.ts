import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshTokenModel from '../modules/auth/models/refreshToken.model';
import { IUser } from '../modules/user/model/user.model';
import { config } from '../configs/app.config';
import { UnauthorizedException } from './appError';

const generateJwtToken = async (user: IUser, device: string, ip: string) => {
  const accessToken = jwt.sign(
    {
      user: {
        id: user._id,
        role: user.role,
      },
    },
    config.ACCESS_TOKEN,
    { expiresIn: '1h' }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // refresh token expires in 7 days

  await RefreshTokenModel.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
    device,
    ip,
  });

  return { accessToken, refreshToken };
};

export default generateJwtToken;
