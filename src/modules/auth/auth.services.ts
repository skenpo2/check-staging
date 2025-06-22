import { NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { BadRequestException, NotFoundException } from '../../utils/appError';
import redis from '../../redis';
import { sendEmail } from '../../utils/sendMail';
import RefreshTokenModel from './models/refreshToken.model';
import logger from '../../utils/logger';
import UserModel, { IUser } from '../user/model/user.model';
import { ProviderEnumType } from '../../enums/account-provider.enum';
import { RoleEnum } from '../../enums/user-role.enum';
import { IRegisterUser } from '../../validations/auth.validations';
import { hashPassword } from '../../utils/argonPassword';
import { config } from '../../configs/app.config';
import { LoginMetadata } from '../../utils/getLoginMetaData';

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

/* Registration and verify registration */

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
      'Too many requests!, Please wait 1 hour before requesting again'
    );
  }

  if (await redis.get(`otp_cooldown:${email}`)) {
    throw new BadRequestException(
      'Please wait 1 minute before requesting again'
    );
  }
};

export const trackOtpRequests = async (email: string, next: NextFunction) => {
  const otpRequestKey = `otp_request_count:${email}`;

  let otpRequest = parseInt((await redis.get(otpRequestKey)) || '0');

  if (otpRequest >= 4) {
    await redis.set(`otp_spam_lock:${email}`, 'locked', 'EX', 3600); // lock for 1h
    throw new BadRequestException(
      'Too many requests!, Please wait 1hour before requesting again'
    );
  }

  await redis.set(otpRequestKey, otpRequest + 1, 'EX', 3600); //track request
};

export const sendRegisterOtp = async (
  role: string,
  user: IRegisterUser,
  template: string
) => {
  try {
    const otp = crypto.randomInt(100000, 999999);

    const { email, name, phone, password } = user;
    const hashedPassword = await hashPassword(password);

    const otpData = {
      email,
      name,
      phone,
      hashedPassword,
      role,
      otp,
    };
    await Promise.all([
      sendEmail(email, 'Verify your Email', template, { name, otp }),

      //store user data for 30 minutes
      redis.set(`otp_data:${email}`, JSON.stringify(otpData), 'EX', 1800),
      redis.set(`otp_cooldown:${user.email}`, 'true', 'EX', 60),
    ]);
  } catch (error) {
    throw error;
  }
};

export const resendRegisterOtp = async (email: string, template: string) => {
  try {
    const otp = crypto.randomInt(100000, 999999);

    const storedOtpString = await redis.get(`otp_data:${email}`);
    if (!storedOtpString) {
      throw new BadRequestException('Invalid details, kindly sign-up again');
    }

    const storedData = JSON.parse(storedOtpString);

    const otpData = {
      email: storedData.email,
      name: storedData.name,
      phone: storedData.phone,
      hashedPassword: storedData.hashedPassword,
      role: storedData.role,
      otp,
    };

    await Promise.all([
      redis.del(`otp_data:${email}`),
      sendEmail(email, 'Verify your Email', template, {
        name: otpData.name,
        otp,
      }),
      redis.set(`otp_data:${email}`, JSON.stringify(otpData), 'EX', 1800),
      redis.set(`otp_cooldown:${email}`, 'true', 'EX', 60),
    ]);
  } catch (error) {
    throw error;
  }
};

export const verifyRegisterOtp = async (email: string, otp: string) => {
  try {
    const storedOtpString = await redis.get(`otp_data:${email}`);

    if (!storedOtpString) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const { otp: storedOtp } = JSON.parse(storedOtpString) as { otp: number };

    const failedAttemptsKey = `otp_attempts:${email}`;
    const failedAttempts = parseInt(
      (await redis.get(failedAttemptsKey)) || '0'
    );

    if (storedOtp.toString() !== otp) {
      if (failedAttempts >= 2) {
        await redis.set(`otp_lock:${email}`, 'locked', 'EX', 1800); // lock for 30 minutes
        await redis.del(`otp_data:${email}`); // remove OTP data
        throw new BadRequestException(
          'Too many failed attempts, your account is locked for 30 minutes'
        );
      }

      await redis.set(failedAttemptsKey, failedAttempts + 1, 'EX', 300);
      throw new BadRequestException(
        `Invalid OTP. ${2 - failedAttempts} attempts left.`
      );
    }

    await redis.del(`otp_data:${email}`);
    await redis.del(failedAttemptsKey);

    return JSON.parse(storedOtpString);
  } catch (error) {
    throw error;
  }
};

/* Password Reset */

export const checkResetLinkRestrictions = async (
  email: string,
  next: NextFunction
) => {
  const [isLocked, isSpamLocked, isCoolingDown] = await Promise.all([
    redis.get(`reset_lock:${email}`),
    redis.get(`reset_spam_lock:${email}`),
    redis.get(`reset_cooldown:${email}`),
  ]);

  if (isLocked) {
    throw new BadRequestException(
      'Account locked due to multiple failed attempts. Try again after 30 minutes.'
    );
  }

  if (isSpamLocked) {
    throw new BadRequestException(
      'Too many requests! Please wait 1 hour before requesting again.'
    );
  }

  if (isCoolingDown) {
    throw new BadRequestException(
      'Please wait 1 minute before requesting another reset.'
    );
  }
};

export const trackResetLinkRequests = async (email: string) => {
  const resetRequestKey = `reset_request_count:${email}`;
  const currentCount = parseInt((await redis.get(resetRequestKey)) || '0');

  if (currentCount >= 4) {
    await Promise.all([
      redis.set(`reset_spam_lock:${email}`, 'locked', 'EX', 3600), // 1 hour lock
      redis.del(resetRequestKey), // reset the count after lock
    ]);
    throw new BadRequestException(
      'Too many requests! Please wait 1 hour before requesting again.'
    );
  }

  await redis.set(resetRequestKey, currentCount + 1, 'EX', 3600); // Count resets every 1h
};

export const sendPasswordResetLink = async (user: IUser, template: string) => {
  try {
    const accessToken = jwt.sign(
      {
        user: {
          id: user._id,
          role: user.role,
        },
      },
      config.ACCESS_TOKEN,
      { expiresIn: '10m' }
    );
    const { name, email } = user;

    // Generate password reset link
    const resetLink = `${config.FRONTEND_ORIGIN}?d=${email}&t=${accessToken}`;

    // Send reset email
    await sendEmail(email, 'Reset your Password', template, {
      name,
      resetLink,
    });

    // Cooldown to prevent spam
    await redis.set(`reset_cooldown:${email}`, 'true', 'EX', 60);
    return;
  } catch (error) {
    throw error;
  }
};
export const setNewPassword = async (
  userId: string,
  email: string,
  password: string
) => {
  try {
    // Find user
    const user = await UserModel.findById(userId);
    if (!user || user.email.toString() !== email) {
      throw new NotFoundException('User not found or invalid details');
    }

    user.password = await hashPassword(password);
    await user.save();

    return user;
  } catch (error) {
    throw error;
  }
};

export const validateUserCredentials = async (
  email: string,
  password: string
) => {
  try {
    const normalizedEmail = email.toLowerCase();
    const lockKey = `login_lock:${normalizedEmail}`;
    const failedAttemptsKey = `login_attempts:${normalizedEmail}`;

    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new NotFoundException('Invalid login credentials');
    }

    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      throw new BadRequestException(
        'Account locked due to multiple failed login attempts, Try again after 30 minutes'
      );
    }
    const isPassword = await user.comparePassword(password);
    const failedAttempts = parseInt(
      (await redis.get(failedAttemptsKey)) || '0'
    );

    if (!isPassword) {
      if (failedAttempts >= 4) {
        await redis.set(lockKey, 'locked', 'EX', 1800); // lock for 30 mins
        throw new BadRequestException(
          'Too many failed login attempts, your account is locked for 30 minutes'
        );
      }

      await redis.set(failedAttemptsKey, failedAttempts + 1, 'EX', 1800);
      logger.warn?.(
        `Login attempt failed for ${normalizedEmail}, attempt: ${
          failedAttempts + 1
        }`
      );

      throw new BadRequestException(
        `Invalid details. ${4 - failedAttempts} attempts left.`
      );
    }

    await redis.del(failedAttemptsKey);
    return user;
  } catch (error) {
    throw error;
  }
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

export const sendLoginNotification = async (
  email: string,
  template: string,
  name: string,
  data: LoginMetadata
) => {
  try {
    const { ipAddress, device, location, loginTime, rawDeviceInfo } = data;

    await sendEmail(email, 'Login Notification', template, {
      ipAddress,
      device,
      location,
      loginTime,
      rawDeviceInfo,
      name,
    });
  } catch (error) {
    throw error;
  }
};
