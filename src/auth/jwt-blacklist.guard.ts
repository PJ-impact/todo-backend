import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * JwtBlacklistGuard — the "broken token" enforcer.
 *
 * After a user logs out, their token is stored in the token_blacklist table.
 * This guard checks every protected request against that table.
 *
 * How it fits into the auth pipeline:
 *   Request → AuthGuard('jwt') (validates signature + expiry)
 *          → JwtBlacklistGuard  (checks if the token was explicitly revoked)
 *          → Route handler
 *
 * Usage — apply it alongside AuthGuard('jwt'):
 *   @UseGuards(AuthGuard('jwt'), JwtBlacklistGuard)
 *
 * Or apply globally in main.ts for all routes.
 */
@Injectable()
export class JwtBlacklistGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // req.user is populated by AuthGuard('jwt') which runs before this guard.
    // It contains the decoded JWT payload including the jti claim.
    const jti: string | undefined = request.user?.jti;

    // If the token has no jti it was issued before we added the claim.
    // For backwards-compatibility we allow it — old tokens will naturally expire.
    if (!jti) {
      return true;
    }

    const isBlacklisted = await this.authService.isTokenBlacklisted(jti);

    if (isBlacklisted) {
      throw new UnauthorizedException(
        'This session has been terminated. Please log in again.',
      );
    }

    return true;
  }
}
