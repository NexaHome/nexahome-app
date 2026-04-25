import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response.type';
import { RegisterResponse } from './dto/register-response.type';
import { LoginInput } from './dto/login.input';
import { CreateUserInput } from '../users/dto/create-user.input';
import { User } from '../../models/user.model';
import { UsersService } from '../users/users.service';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => RegisterResponse)
  register(@Args('createUserInput') createUserInput: CreateUserInput): Promise<RegisterResponse> {
    return this.authService.register(createUserInput);
  }

  @Mutation(() => AuthResponse)
  login(@Args('loginInput') loginInput: LoginInput): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.userId);
  }
}
