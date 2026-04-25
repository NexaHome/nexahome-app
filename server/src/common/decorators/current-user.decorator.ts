import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext().req.user as AuthenticatedUser;
  },
);
