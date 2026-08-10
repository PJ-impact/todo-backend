import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import { Inject } from '@nestjs/common';
import { passwordResetTokens } from '../db/schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('No account found with that email.');
    }
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Incorrect password.');
    }
    const { password: _pwd, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async signup(data: { email: string; password: string; username: string; firstName: string; lastName: string; }) {
    const existingEmail = await this.usersService.findByEmail(data.email);
    if (existingEmail) {
      throw new BadRequestException('Email is already registered.');
    }

    const existingUsername = await this.usersService.findByUsername(data.username);
    if (existingUsername) {
      throw new BadRequestException('Username is already taken.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      email: data.email,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      password: hashedPassword,
    });
    const { password, ...result } = user;
    return result;
  }

  async refreshToken(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Security: always return the same message whether the email exists or not.
    // This prevents attackers from using this endpoint to discover registered emails.
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    // Generate a cryptographically random token — this is what goes in the email link
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing it — if the DB is leaked, raw tokens are useless
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Delete any existing unused reset tokens for this user before creating a new one
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Save the hashed token to the database
    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Build the reset link — points to your frontend reset password page with the raw token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Send the email with the link
    await this.emailService.sendPasswordResetEmail(user.email, resetLink);

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    // Hash the incoming token to compare against what's stored in the DB
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const record = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .get();

    // Token doesn't exist — either already used, never issued, or tampered with
    if (!record) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    // Token exists but has expired
    if (new Date(record.expiresAt) < new Date()) {
      await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    // Token is valid — hash the new password and update the user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(record.userId, hashedPassword);

    // Delete the token immediately — it's single-use only
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }
}
