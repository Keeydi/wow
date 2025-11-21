import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  // For Gmail, you can use app-specific password
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_APP_PASSWORD,
    },
  });

  return transporter;
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Check if email is configured
    if (!process.env.SMTP_USER && !process.env.SMTP_EMAIL) {
      console.warn('Email not configured. Set SMTP_USER and SMTP_PASSWORD in .env file');
      return false;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"HR Hub System" <${process.env.SMTP_USER || process.env.SMTP_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string
): Promise<boolean> => {
  const resetUrl = `${process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:8080'}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #051a66 0%, #0b2987 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">HR Hub System</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #051a66; margin-top: 0;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>We received a request to reset your password for your HR Hub account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #051a66; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="font-size: 12px; color: #666; margin-top: 30px;">
          <strong>This link will expire in 1 hour.</strong>
        </p>
        <p style="font-size: 12px; color: #666;">
          If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Password Reset Request - HR Hub System',
    html,
  });
};

