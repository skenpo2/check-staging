import transporter from '../configs/mail.config';

type SendMailParams = {
  to: string;
  subject: string;
  html: string;
};

const sendMail = async ({
  to,
  subject,
  html,
}: SendMailParams): Promise<void> => {
  const mailOptions = {
    from: '"Verify Me" <ademichael367@gmail.com>',
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
