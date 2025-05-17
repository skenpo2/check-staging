import jwt from 'jsonwebtoken';
import { UserDocument } from '../models/user.model';
import { config } from '../configs/app.config';
import crypto from 'crypto';
import RefreshTokenModel from '../modules/auth/models/refreshToken.model';

const generateJwtToken = async (user: UserDocument) => {
  const accessToken = jwt.sign(
    {
      user: {
        id: user._id,
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
  });

  return { accessToken, refreshToken };
};

export default generateJwtToken;
