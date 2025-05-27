import { NextFunction } from 'express';
import crypto from 'crypto';
import { BadRequestException } from '../../utils/appError';
import redis from '../../redis';
import { sendEmail } from '../../utils/sendMail';

export const checkOtpRestrictions = async (
  email: string,
  next: NextFunction
) => {
  if (await redis.get(`otp_locked:${email}`)) {
    throw new BadRequestException(
      'Account locked due to multiple failed attempts, Try again after 30 minutes'
    );
  }
  if (await redis.get(`otp_spam_locked:${email}`)) {
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

  if (otpRequest >= 3) {
    await redis.set(`otp_spam_lock:${email}`, 'locked', 'EX', 3600); // lock for 1h
    new BadRequestException(
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
