// auth.controller.ts
import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler'; 
import { AuthService } from './auth.service';
import { JwtBlacklistGuard } from './jwt-blacklist.guard';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Public Routes ───────────────────────────────────────────────────────────

  // Strict limit: Max 30 login requests per half a second (500 milliseconds)
  @Throttle({ default: { limit: 30, ttl: 500 } })
  @Post('login')
  @ApiOperation({ summary: 'Login and receive a JWT access token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Access token returned.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  @ApiResponse({ status: 403, description: 'Account deactivated.' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.authService.login(user);
  }

  // Strict limit: Max 3 registration attempts per minute (60000 milliseconds)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'User registered.' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // Strict limit: Max 2 password reset requests per minute
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Reset email sent if account exists.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // Strict limit: Max 3 password reset completion executions per minute
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using the token from the email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ─── Protected Routes (require JWT) ─────────────────────────────────────────
  // Note: These protected routes fall back onto your global limit of 60 req/min from AppModule

  /**
   * POST /auth/logout
   *
   * Process:
   *   1. JWT guard verifies the token is valid and not expired
   *   2. We extract the raw token from the Authorization header
   *   3. The service decodes the jti and stores it in the token_blacklist table
   *   4. Future requests using this token will be rejected by JwtBlacklistGuard
   */
  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), JwtBlacklistGuard)
  @ApiOperation({ summary: 'Logout — invalidate the current access token' })
  @ApiResponse({ status: 201, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Token missing or invalid.' })
  async logout(@Req() req) {
    // Extract the raw token string from the "Bearer <token>" header
    const authHeader: string = req.headers['authorization'] ?? '';
    const token = authHeader.replace('Bearer ', '');
    return this.authService.logout(token);
  }

  /**
   * DELETE /auth/account
   *
   * Soft-delete (deactivate) the logged-in user's account.
   *
   * Process:
   *   1. Sets isActive = false and deletedAt = now on the user row
   *   2. Immediately invalidates the current JWT (logs the user out)
   *   3. A nightly cron job will permanently delete the row after 30 days
   *   4. If the user changes their mind, they contact support within 30 days
   */
  @Delete('account')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), JwtBlacklistGuard)
  @ApiOperation({
    summary:
      'Soft-delete the logged-in account. Account is marked inactive and permanently erased after 30 days.',
  })
  @ApiResponse({ status: 200, description: 'Account deactivated.' })
  @ApiResponse({ status: 401, description: 'Token missing or invalid.' })
  async deleteAccount(@Req() req) {
    const authHeader: string = req.headers['authorization'] ?? '';
    const token = authHeader.replace('Bearer ', '');
    return this.authService.softDeleteAccount(req.user.userId, token);
  }

  @Post('refresh')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), JwtBlacklistGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 201, description: 'New access token returned.' })
  async refresh(@Req() req) {
    return this.authService.refreshToken(req.user);
  }
}

