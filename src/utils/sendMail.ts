import nodemailer from 'nodemailer';
import path from 'path';
import ejs from 'ejs';
import { config } from '../configs/app.config';
import logger from './logger';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD,
  },
});

const renderEmailTemplate = async (
  templateName: string,
  data: Record<string, any>
): Promise<string> => {
  const templatePath = path.join(
    __dirname,
    'email-templates',
    `${templateName}.ejs`
  );

  return ejs.renderFile(templatePath, data);
};

// send an email

export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  data: Record<string, any>
) => {
  try {
    const html = await renderEmailTemplate(templateName, data);
    await transporter.sendMail({
      from: `<config.SMTP_USER>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    logger.error(`Error sending email: ${error}`);
    return false;
  }
};
