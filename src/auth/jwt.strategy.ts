import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'change_this_secret',
    });
  }

  /**
   * Called after the JWT signature is verified.
   * Whatever we return here becomes req.user in route handlers and guards.
   *
   * We include jti so the JwtBlacklistGuard can check it against the blacklist
   * without having to decode the token again.
   */
  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      jti: payload.jti, // <-- exposed so JwtBlacklistGuard can read it
    };
  }
}
