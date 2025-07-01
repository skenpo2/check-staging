import { NextFunction, Request, Response } from 'express';
import AsyncHandler from '../../middlewares/asyncHandler';
import { kycSchema } from '../../validations/kyc.validations';
import KycModel from './model/kyc.model';
import {
  ALLOWED_STATUS_TRANSITIONS,
  KycStatusEnum,
  KycStatusEnumType,
} from '../../enums/kyc-status.enum';
import { HTTPSTATUS } from '../../configs/http.config';
import UserModel from './model/user.model';

export const createKycInfo = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const email = req.user?.email;
    const name = req.user?.name;

    if (!email) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ success: false, message: 'User email is required.' });
    }

    let kyc = await KycModel.findOne({ email: email.toLowerCase() });

    if (!kyc) {
      kyc = new KycModel({
        email: email.toLowerCase(),
        name: name || 'Unknown User',
        status: KycStatusEnum.PENDING,
      });
      await kyc.save();

      return res.status(HTTPSTATUS.CREATED).json({
        success: true,
        data: {
          email: kyc.email,
          name: kyc.name,
          id: kyc._id,
        },
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      data: {
        email: kyc.email,
        name: kyc.name,
        id: kyc._id,
      },
    });
  }
);

export const updateKycInfo = AsyncHandler(
  async (req: Request, res: Response, Next: NextFunction) => {
    const { id } = req.params;
    const body = kycSchema.parse({ ...req.body });

    const { name, email, dateOfBirth, address, businessName, businessAddress } =
      body;

    const updatedKyc = await KycModel.findByIdAndUpdate(
      id,
      {
        name,
        email,
        dateOfBirth,
        address,
        businessName,
        businessAddress,
        status: KycStatusEnum.SUBMITTED,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedKyc) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ success: false, message: 'User record not found' });
    }
    return res.status(HTTPSTATUS.OK).json({
      success: true,
      data: {
        email: email,
        kycId: id,
      },
    });
  }
);

export const updateKycStatus = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(KycStatusEnum).includes(status)) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ message: 'Invalid status value.' });
    }

    // Fetch current KYC document
    const kyc = await KycModel.findById(id);
    if (!kyc) {
      return res
        .status(HTTPSTATUS.NOT_FOUND)
        .json({ message: 'KYC record not found.' });
    }

    const currentStatus = kyc.status as KycStatusEnumType;
    const desiredStatus = status as KycStatusEnumType;

    // Validate allowed status transitions
    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (!allowedNextStatuses.includes(desiredStatus)) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: `Cannot change status from ${currentStatus} to ${desiredStatus}.`,
      });
    }

    // Update status
    kyc.status = desiredStatus;
    await kyc.save();

    // If status became COMPLETED, mark user as verified
    if (desiredStatus === KycStatusEnum.COMPLETED) {
      if (kyc.email) {
        const user = await UserModel.findOneAndUpdate(
          { email: kyc.email.toLowerCase() },
          { isVerified: true },
          { new: true }
        );

        if (!user) {
          return res.status(HTTPSTATUS.NOT_FOUND).json({
            message: `User with email ${kyc.email} not found to mark as verified.`,
          });
        }
      } else {
        return res.status(HTTPSTATUS.BAD_REQUEST).json({
          message: `KYC record has no email to link user verification.`,
        });
      }
    }

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Status updated successfully',
      data: {
        email: kyc.email,
        name: kyc.name,
        id: kyc._id,
        status: kyc.status,
      },
    });
  }
);

export const getKycByEmail = AsyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ message: 'Email is required.' });
    }

    const kyc = await KycModel.findOne({ email: email.toLowerCase() });

    if (!kyc) {
      return res
        .status(HTTPSTATUS.NOT_FOUND)
        .json({ message: 'KYC record not found.' });
    }

    res.status(HTTPSTATUS.OK).json({ success: true, data: kyc });
  }
);
