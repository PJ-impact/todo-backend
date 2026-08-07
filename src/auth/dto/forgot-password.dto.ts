import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'jdoe@example.com',
    description: 'The email address associated with your account.',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;
}
