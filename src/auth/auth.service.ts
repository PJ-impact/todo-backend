import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import { passwordResetTokens, tokenBlacklist } from '../db/schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  // ─── Login / Signup ──────────────────────────────────────────────────────────

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('No account found with that email.');
    }

    // Block soft-deleted (inactive) accounts from logging in.
    // isActive is false when the user has clicked "delete my account" but the
    // 30-day grace period hasn't expired yet.
    if (!user.isActive) {
      throw new ForbiddenException(
        'This account has been deactivated. Contact support if you wish to restore it.',
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Incorrect password.');
    }
    const { password: _pwd, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string }) {
    // jti (JWT ID) is a unique identifier stamped on every token.
    // When the user logs out, we store this jti in the blacklist table.
    // The JwtBlacklistGuard checks every request against this table.
    const jti = crypto.randomUUID();

    const payload = { sub: user.id, email: user.email, jti };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async signup(data: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
  }) {
    const existingEmail = await this.usersService.findByEmail(data.email);
    if (existingEmail) {
      throw new BadRequestException('Email is already registered.');
    }

    const existingUsername = await this.usersService.findByUsername(
      data.username,
    );
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
    const jti = crypto.randomUUID();
    const payload = { sub: user.id, email: user.email, jti };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  /**
   * Invalidate the user's current token so it cannot be reused.
   *
   * Process:
   *   1. Decode the token (without re-verifying — it was already verified by the guard)
   *   2. Extract the jti (unique token ID) and exp (expiry timestamp)
   *   3. Store the jti in the token_blacklist table
   *   4. The JwtBlacklistGuard will reject any future request that uses this jti
   */
  async logout(token: string): Promise<{ message: string }> {
    // Decode the token to read its claims — no need to re-verify here
    const decoded = this.jwtService.decode(token);

    if (!decoded?.jti) {
      // Token was issued before we added jti — treat it as already invalidated
      return { message: 'Logged out successfully.' };
    }

    // Convert JWT exp (Unix seconds) to ISO string for storage
    const expiresAt = decoded.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // fallback: 24h

    // Insert into blacklist — if already there (duplicate logout), ignore gracefully
    const existing = await this.db
      .select()
      .from(tokenBlacklist)
      .where(eq(tokenBlacklist.jti, decoded.jti))
      .get();

    if (!existing) {
      await this.db.insert(tokenBlacklist).values({
        jti: decoded.jti,
        expiresAt,
      });
    }

    return { message: 'Logged out successfully.' };
  }

  // ─── Check if a token is blacklisted (used by the guard) ────────────────────

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const record = await this.db
      .select()
      .from(tokenBlacklist)
      .where(eq(tokenBlacklist.jti, jti))
      .get();
    return !!record;
  }

  // ─── Soft Delete Account ─────────────────────────────────────────────────────

  /**
   * Mark the user's account as inactive instead of deleting it immediately.
   *
   * Process:
   *   1. Set isActive = false and deletedAt = now on the user row
   *   2. The login flow blocks inactive accounts from signing in
   *   3. A nightly cron job permanently deletes users where deletedAt < 30 days ago
   */
  async softDeleteAccount(
    userId: number,
    token: string,
  ): Promise<{ message: string }> {
    await this.usersService.softDelete(userId);

    // Also invalidate the current token so the user is immediately logged out
    await this.logout(token);

    return {
      message:
        'Your account has been deactivated. It will be permanently deleted after 30 days. ' +
        'Contact support within that window if you change your mind.',
    };
  }

  // ─── Password Reset ───────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Security: always return the same message whether the email exists or not.
    // This prevents attackers from using this endpoint to discover registered emails.
    if (!user) {
      return {
        message: 'If that email is registered, a reset link has been sent.',
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await this.db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetLink);

    return {
      message: 'If that email is registered, a reset link has been sent.',
    };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const record = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .get();

    if (!record) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    if (new Date(record.expiresAt) < new Date()) {
      await this.db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash));
      throw new BadRequestException(
        'Reset token has expired. Please request a new one.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(record.userId, hashedPassword);

    await this.db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));

    return {
      message:
        'Password reset successfully. You can now log in with your new password.',
    };
  }
}
