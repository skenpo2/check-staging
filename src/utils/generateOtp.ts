import OtpModel from '../models/otp.model';
import argon2 from 'argon2';

const generateOtp = async (email: string): Promise<string> => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); //  expires 5 mins from now

    // Delete any existing OTPs for this email
    await OtpModel.deleteMany({ email });

    // hash the code
    const hashedCode = await argon2.hash(code);

    // Save new OTP
    await OtpModel.create({ email, code: hashedCode, expiresAt });

    return code;
  } catch (error) {
    throw error;
  }
};

export default generateOtp;
