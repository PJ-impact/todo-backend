import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
}
