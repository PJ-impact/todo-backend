import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  // Logger helps us see email activity in the server console without exposing it to the client
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // The transporter is the "email client" — configured once, reused for every send
    // We use Gmail's SMTP server with an App Password (not your real Gmail password)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
    const from = this.configService.get<string>('GMAIL_USER');

    try {
      await this.transporter.sendMail({
        from: `"Todo App" <${from}>`,
        to: toEmail,
        subject: 'Reset Your Password',
        // Plain text fallback for email clients that don't render HTML
        text: `You requested a password reset. Use the link below to set a new password. This link expires in 1 hour.\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
        // HTML version for modern email clients
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
            <h2>Reset Your Password</h2>
            <p>You requested a password reset for your Todo App account.</p>
            <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetLink}"
               style="display:inline-block; padding:12px 24px; background:#4F46E5;
                      color:#fff; text-decoration:none; border-radius:6px; margin:16px 0;">
              Reset Password
            </a>
            <p style="color:#888; font-size:12px;">
              If you did not request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      this.logger.log(`Password reset email sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${toEmail}`, error);
      throw new InternalServerErrorException('Failed to send reset email. Please try again.');
    }
  }
}
