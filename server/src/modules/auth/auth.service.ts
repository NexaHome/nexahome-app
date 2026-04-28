import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginInput } from './dto/login.input';
import { HomesService } from '../homes/homes.service';
import { CreateUserInput } from '../users/dto/create-user.input';
import { AuthResponse } from './dto/auth-response.type';
import { RegisterResponse } from './dto/register-response.type';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
} from '../../common/exceptions/app.exceptions';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly homesService: HomesService,
  ) {}

  async register(createUserInput: CreateUserInput): Promise<RegisterResponse> {
    // Check if email already exists
    const existing = await this.usersService.findByEmail(createUserInput.email);
    if (existing) {
      throw new EmailAlreadyExistsException();
    }

    // Hash password with bcryptjs
    const hashedPassword = await bcrypt.hash(createUserInput.password!, 10);

    const user = await this.usersService.create({
      ...createUserInput,
      password: hashedPassword,
    });

    // Automatically create a default home for the new user
    if (user && user._id) {
      await this.homesService.create(user._id.toString(), {
        name: 'My Home',
      });
    }

    return {
      userId: user._id?.toString() ?? '',
      email: user.email,
      name: user.name,
      message: 'Registration successful. Please login to continue.',
    };
  }

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginInput.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const passwordMatch = await bcrypt.compare(loginInput.password, user.password as string);
    if (!passwordMatch) {
      throw new InvalidCredentialsException();
    }

    const userId = user._id?.toString() ?? '';
    const payload = { sub: userId, email: user.email, name: user.name };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      userId,
      email: user.email,
      name: user.name,
    };
  }
}
