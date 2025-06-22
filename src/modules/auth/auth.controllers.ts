import { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';
import { HTTPSTATUS } from '../../configs/http.config';
import asyncHandler from '../../middlewares/asyncHandler';
import {
  LoginUserSchema,
  RegisterUserSchema,
  resetPasswordSchema,
  UserEmailSchema,
  VerifyRegisterUserSchema,
} from '../../validations/auth.validations';
import {
  checkOtpRestrictions,
  checkResetLinkRestrictions,
  logOutService,
  sendLoginNotification,
  sendPasswordResetLink,
  sendRegisterOtp,
  setNewPassword,
  trackOtpRequests,
  trackResetLinkRequests,
  validateUserCredentials,
  verifyRefreshTokenService,
  verifyRegisterOtp,
} from './auth.services';
import UserModel from '../user/model/user.model';
import { BadRequestException, NotFoundException } from '../../utils/appError';
import AsyncHandler from '../../middlewares/asyncHandler';

import generateJwtToken from '../../utils/generateJwt';
import logger from '../../utils/logger';
import { ProviderEnum } from '../../enums/account-provider.enum';
import { config } from '../../configs/app.config';
import { getLoginMetadata } from '../../utils/getLoginMetaData';

const isProduction = config.NODE_ENV === 'production';

export const registerUserController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const role = req.params.role;

    console.log(role);
    console.log(typeof role);

    const validRoles = ['customer', 'expert'];

    if (!role || typeof role !== 'string' || !validRoles.includes(role)) {
      throw new BadRequestException('User role not valid');
    }

    const body = RegisterUserSchema.parse({ ...req.body });

    const { email } = body;
    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    await checkOtpRestrictions(email, next);
    await trackOtpRequests(email, next);

    await sendRegisterOtp(role.toUpperCase(), body, 'user-activation-mail');

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Verify your email to continue',
    });
  }
);

export const verifyUserRegistrationController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = VerifyRegisterUserSchema.parse({ ...req.body });

    const userData = await verifyRegisterOtp(body.email, body.otp);

    const { email, hashedPassword, name, phone, role } = userData;

    const account = {
      provider: ProviderEnum.EMAIL,
      providerId: email,
      googleAccessToken: '',
      googleRefreshToken: '',
    };

    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      account,
    });

    await newUser.save();

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Email verified successfully',
    });
  }
);

export const loginUserController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = LoginUserSchema.parse({ ...req.body });

    const { email, password } = body;

    const user = await validateUserCredentials(email, password);
    const loginMetadata = getLoginMetadata(req);

    const { accessToken, refreshToken } = await generateJwtToken(
      user,
      loginMetadata.device,
      loginMetadata.ipAddress
    );

    //strip the user password from response
    const userOmitPassword = user.omitPassword();

    await sendLoginNotification(
      email,
      'login-notification-mail',
      user.name,
      loginMetadata
    );

    return res
      .status(HTTPSTATUS.OK)
      .cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({
        success: true,
        message: 'login successful',
        user: {
          id: userOmitPassword._id,
          name: userOmitPassword.name,
          role: userOmitPassword.role,
        },
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
      throw new NotFoundException('User not found or invalid details');
    }

    await checkResetLinkRestrictions(email, next);
    await trackResetLinkRequests(email);
    await sendPasswordResetLink(user, 'forgot-password-mail');
    logger.warn(`Password reset link sent  to : ${email}`);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Check your Email inbox to continue',
    });
  }
);

export const setPasswordController = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = resetPasswordSchema.parse({ ...req.body });

    const userId = req?.user?._id;
    const { email, password } = body;

    const user = await setNewPassword(userId, email, password);
    if (!user) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        message: 'set new password failed',
      });
    }

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Password set successfully',
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
    const accessToken = jwt.sign(
      {
        user: {
          id: user._id,
          role: user.role,
        },
      },
      config.ACCESS_TOKEN,
      { expiresIn: '5m' }
    );
    return res.status(HTTPSTATUS.OK).json({
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

    return res
      .status(HTTPSTATUS.OK)
      .clearCookie('jwt', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .json({
        success: true,
        message: 'Logged out successfully!',
      });
  }
);
