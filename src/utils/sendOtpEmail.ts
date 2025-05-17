import generateOtp from './generateOtp';
import sendMail from './mailer';

export const sendOtpEmail = async (user: { name: string; email: string }) => {
  const code = await generateOtp(user.email);

  const html = `
    <div style="font-family:Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Welcome to <span style="color:#4A90E2;">MyCoolApp</span>!</h2>
      <p>Hi ${user.name},</p>
      <p>Your OTP is: <strong>${code}</strong></p>
      <p>This code will expire in 5 minutes.</p>
      <p style="margin-top:30px;">Cheers, <br />The MyCoolApp Team</p>
    </div>
  `;

  await sendMail({
    to: user.email,
    subject: 'Your OTP Code 🔐',
    html,
  });
};
