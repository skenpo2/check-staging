import { Request, Response, NextFunction } from 'express';
import { HTTPSTATUS } from '../../configs/http.config';
import asyncHandler from '../../middlewares/asyncHandler';
import {
  LoginUserSchema,
  RegisterUserSchema,
  UserEmailSchema,
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

export const registerUserController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = RegisterUserSchema.parse({ ...req.body });

    const { email, name } = body;

    const existingUser = await UserModel.findOne({ email });
    console.log(existingUser);

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

export const verifyUserRegistration = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = VerifyRegisterUserSchema.parse({ ...req.body });

    const { email, name, phone, password, otp } = body;

    await verifyOtp(email, otp);

    const newUser = new UserModel({
      name,
      email,
      password,
      phone,
      role: RoleEnum.CUSTOMER,
    });

    await newUser.save();

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'User registered successfully',
    });
  }
);

export const loginUser = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = LoginUserSchema.parse({ ...req.body });

    const { email, password } = body;
    const user = await UserModel.findOne({ email: email });

    if (!user) {
      throw new NotFoundException('User not found or Incorrect details');
    }

    const isPassword = user.comparePassword(password);

    if (!isPassword) {
      throw new BadRequestException('Invalid details');
    }

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
        message: 'login successful',
        user,
        token: accessToken,
      });
  }
);

export const forgetPassword = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = UserEmailSchema.parse({ ...req.body });

    const { email } = body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not or invalid details');
    }

    await checkOtpRestrictions(email, next);
    await trackOtpRequests(email, next);
    await sendOtp(user.name, email, 'user-activation-mail');
    logger.warn('Password reset otp sent');

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Verify your email to continue',
    });
  }
);

export const verifyForgetPassword = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = VerifyRegisterUserSchema.parse({ ...req.body });

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
