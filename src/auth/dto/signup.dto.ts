import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: 'jdoe',
    description: 'The chosen username for the new user.',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    example: 'jdoe@example.com',
    description: 'The email address for the new user.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'The first name of the user.',
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'The last name of the user.',
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'MySecret@123',
    description:
      'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character (e.g. @, #, $, !).' })
  password: string;
}
