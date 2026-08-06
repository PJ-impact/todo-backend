import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The user email address used for login.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'MySecret123',
    description: 'The user password.',
  })
  @IsNotEmpty()
  password: string;
}
