import OtpModel from '../models/otp.model';
import argon2 from 'argon2';

export const verifyOtp = async (
  email: string,
  code: string
): Promise<boolean> => {
  let currentDate = Date.now();
  const otpDoc = await OtpModel.findOne({ email });

  if (!otpDoc) return false;

  const isExpired = otpDoc.expiresAt.getTime() < currentDate;
  const isMatch = await argon2.verify(otpDoc.code, code);

  console.log(isMatch);

  if (isMatch && !isExpired) {
    await otpDoc.deleteOne(); // Invalidate OTP after use
    return true;
  }

  return false;
};
