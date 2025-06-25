import { NextFunction } from 'express';
import crypto from 'crypto';
import { BadRequestException, NotFoundException } from '../../utils/appError';
import redis from '../../redis';
import { sendEmail } from '../../utils/sendMail';
import RefreshTokenModel from './models/refreshToken.model';
import logger from '../../utils/logger';
import UserModel from '../user/model/user.model';
import { ProviderEnumType } from '../../enums/account-provider.enum';
import { RoleEnum } from '../../enums/user-role.enum';

export const googleLoginOrCreateAccountService = async (body: {
  provider: ProviderEnumType;
  displayName: string;
  providerId: string;
  picture?: string;
  email?: string;
  accessToken: string;
  refreshToken: string;
}) => {
  const {
    provider,
    displayName,
    providerId,
    picture,
    email,
    accessToken,
    refreshToken,
  } = body;

  try {
    let user = await UserModel.findOne({ email });

    if (!user) {
      const account = {
        provider,
        providerId,
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
      };

      user = new UserModel({
        email,
        name: displayName,
        profilePicture: picture || null,
        role: RoleEnum.CUSTOMER,
        account,
      });

      await user.save();
    } else {
      user.account.googleAccessToken = accessToken;
      user.account.googleRefreshToken = refreshToken;
      await user.save();
    }

    return user;
  } catch (error) {
    logger.error('Google login error:', error);
    throw new Error('Failed to login or create user via Google');
  }
};

export const checkOtpRestrictions = async (
  email: string,
  next: NextFunction
) => {
  if (await redis.get(`otp_lock:${email}`)) {
    throw new BadRequestException(
      'Account locked due to multiple failed attempts, Try again after 30 minutes'
    );
  }
  if (await redis.get(`otp_spam_lock:${email}`)) {
    throw new BadRequestException(
      'Too many requests!, Please wait 1hour before requesting again'
    );
  }

  if (await redis.get(`otp_cooldown:${email}`)) {
    throw new BadRequestException(
      'Please wait 1minutes before requesting again'
    );
  }
};

export const trackOtpRequests = async (email: string, next: NextFunction) => {
  const otpRequestKey = `otp_request_count:${email}`;

  let otpRequest = parseInt((await redis.get(otpRequestKey)) || '0');

  if (otpRequest >= 2) {
    await redis.set(`otp_spam_lock:${email}`, 'locked', 'EX', 3600); // lock for 1h
    throw new BadRequestException(
      'Too many requests!, Please wait 1hour before requesting again'
    );
  }

  await redis.set(otpRequestKey, otpRequest + 1, 'EX', 3600); //track request
};

export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  const otp = crypto.randomInt(100000, 999999);
  await sendEmail(email, 'Verify Your Email', template, { name, otp });
  await redis.set(`otp:${email}`, otp, 'EX', 300);
  await redis.set(`otp_cooldown:${email}`, 'true', 'EX', 60);
};

export const verifyOtp = async (email: string, otp: string) => {
  const storedOtp = await redis.get(`otp:${email}`);

  console.log(storedOtp);

  if (!storedOtp) {
    throw new BadRequestException('Invalid or expired Otp');
  }

  const failedAttemptsKey = `otp_attempts:${email}`;
  const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || '0');

  if (storedOtp != otp) {
    if (failedAttempts >= 2) {
      await redis.set(`otp_lock:${email}`, 'locked', 'EX', 1800); //locked for 30 minutes
      await redis.del(`otp:${email}`);
      throw new BadRequestException(
        'Too many failed attempts, your account is locked for 30minutes'
      );
    }
    await redis.set(failedAttemptsKey, failedAttempts + 1, 'EX', 300);
    throw new BadRequestException(
      `Invalid Otp. ${2 - failedAttempts} attempts left. `
    );
  }

  await redis.del(`otp:${email}`, failedAttemptsKey);
};

export const verifyRefreshTokenService = async (refreshToken: string) => {
  try {
    const storedToken = await RefreshTokenModel.findOne({
      token: refreshToken,
    });

    if (!storedToken) {
      logger.warn('Invalid refresh token provided');
      throw new BadRequestException('Invalid refresh token');
    }

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn('Invalid or expired refresh token');
      throw new BadRequestException('Invalid  or expired refresh token');
    }

    const user = await UserModel.findById(storedToken.user);

    if (!user) {
      logger.warn('User does not exist');

      throw new NotFoundException('User does not exist');
    }
    //delete the old refresh token
    await RefreshTokenModel.deleteOne({ _id: storedToken._id });

    return user;
  } catch (error) {
    logger.error('Refresh token error occurred', error);
    throw error;
  }
};

export const logOutService = async (refreshToken: string) => {
  try {
    const storedToken = await RefreshTokenModel.findOneAndDelete({
      token: refreshToken,
    });
    if (!storedToken) {
      logger.warn('Invalid refresh token provided');
      throw new NotFoundException('Invalid refresh token');
    }

    logger.info('Refresh token deleted for logout');
    return true;
  } catch (error) {
    logger.error('Error while logging out', error);
    throw error;
  }
};
