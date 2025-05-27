import { Request, Response, NextFunction } from 'express';
import { HTTPSTATUS } from '../../configs/http.config';
import asyncHandler from '../../middlewares/asyncHandler';
import {
  RegisterUserSchema,
  VerifyRegisterUserSchema,
} from '../../validations/auth.validations';
import {
  checkOtpRestrictions,
  sendOtp,
  trackOtpRequests,
  verifyOtp,
} from './auth.services';
import UserModel from '../user/model/user.model';
import { BadRequestException } from '../../utils/appError';
import AsyncHandler from '../../middlewares/asyncHandler';
import { RoleEnum } from '../../enums/user-role.enum';

export const registerUserController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = RegisterUserSchema.parse({ ...req.body });

    const { email, name, phone, password } = body;

    const existingUser = await UserModel.findOne({ email });
    console.log(existingUser);

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    console.log(email, name, phone, password);

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
