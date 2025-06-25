import { Request, Response, NextFunction } from 'express';
import { HTTPSTATUS } from '../../configs/http.config';
import asyncHandler from '../../middlewares/asyncHandler';
import {
  LoginUserSchema,
  RegisterUserSchema,
  UserEmailSchema,
  verifyForgotPasswordSchema,
  VerifyRegisterUserSchema,
} from '../../validations/auth.validations';
import {
  checkOtpRestrictions,
  logOutService,
  sendOtp,
  trackOtpRequests,
  verifyOtp,
  verifyRefreshTokenService,
} from './auth.services';
import UserModel from '../user/model/user.model';
import { BadRequestException, NotFoundException } from '../../utils/appError';
import AsyncHandler from '../../middlewares/asyncHandler';
import { RoleEnum } from '../../enums/user-role.enum';
import generateJwtToken from '../../utils/generateJwt';
import logger from '../../utils/logger';
import redis from '../../redis';
import {
  ProviderEnum,
  ProviderEnumType,
} from '../../enums/account-provider.enum';

export const registerUserController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = RegisterUserSchema.parse({ ...req.body });

    const { email, name } = body;

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    await checkOtpRestrictions(email, next);
    await trackOtpRequests(email, next);
    await sendOtp(name, email, 'user-activation-mail');

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Verify your email to continue',
    });
  }
);

export const verifyUserRegistrationController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = VerifyRegisterUserSchema.parse({ ...req.body });

    const { email, name, phone, password, otp } = body;

    await verifyOtp(email, otp);

    const account = {
      provider: ProviderEnum.EMAIL,
      providerId: email,
      googleAccessToken: '',
      googleRefreshToken: '',
    };

    const newUser = new UserModel({
      name,
      email,
      password,
      phone,
      role: RoleEnum.CUSTOMER,
      account,
    });

    await newUser.save();

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'User registered successfully',
    });
  }
);

export const loginUserController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = LoginUserSchema.parse({ ...req.body });

    const { email, password } = body;

    const user = await UserModel.findOne({ email: email });

    if (!user) {
      throw new NotFoundException('User not found or Incorrect details');
    }

    if (await redis.get(`login_lock:${email}`)) {
      throw new BadRequestException(
        'Account locked due to multiple failed login attempts, Try again after 30 minutes'
      );
    }

    const isPassword = await user.comparePassword(password);

    const failedAttemptsKey = `login_attempts:${email}`;
    const failedAttempts = parseInt(
      (await redis.get(failedAttemptsKey)) || '0'
    );

    if (!isPassword) {
      if (failedAttempts >= 4) {
        await redis.set(`login_lock:${email}`, 'locked', 'EX', 120); //locked for 30 minutes
        throw new BadRequestException(
          'Too many failed login attempts, your account is locked for 30minutes'
        );
      }
      await redis.set(failedAttemptsKey, failedAttempts + 1, 'EX', 300);
      throw new BadRequestException(
        `Invalid details. ${4 - failedAttempts} attempts left. `
      );
    }

    await redis.del(failedAttemptsKey);

    const { accessToken, refreshToken } = await generateJwtToken(user);

    const userOmitPassword = user.omitPassword();

    return res
      .status(HTTPSTATUS.OK)
      .cookie('jwt', refreshToken, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .json({
        success: true,
        message: 'login successful',
        user: userOmitPassword,
        token: accessToken,
      });
  }
);

export const forgotPasswordController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = UserEmailSchema.parse({ ...req.body });

    const { email } = body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not or invalid details');
    }

    await checkOtpRestrictions(email, next);
    await trackOtpRequests(email, next);
    await sendOtp(user.name, email, 'forgot-password-mail');
    logger.warn('Password reset otp sent');

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Verify your email to continue',
    });
  }
);

export const verifyForgotPasswordController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = verifyForgotPasswordSchema.parse({ ...req.body });

    const { email, password, otp } = body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not or invalid details');
    }

    await verifyOtp(email, otp);

    user.password = password;

    await user.save();

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Password reset successfully',
    });
  }
);
export const refreshTokenController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
      logger.warn('Refresh token missing');
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'Refresh token missing',
      });
    }
    const token = cookies.jwt as string;
    const user = await verifyRefreshTokenService(token);

    if (!user) {
      logger.warn(`Cannot get refresh token`);
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: ' Cannot verify token, kindly log in again',
      });
    }
    logger.info('Refresh token verified ');
    // generate new tokens for user
    const { accessToken, refreshToken } = await generateJwtToken(user);

    return res
      .status(HTTPSTATUS.OK)
      .cookie('jwt', refreshToken, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .json({
        success: true,
        token: accessToken,
      });
  }
);

export const logoutController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
      logger.warn('Refresh token missing');
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'Refresh token missing',
      });
    }
    const token = cookies.jwt as string;

    await logOutService(token);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Logged out successfully!',
    });
  }
);
