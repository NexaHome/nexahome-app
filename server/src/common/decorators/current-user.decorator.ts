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

export const CurrentHomeId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext().homeId as string;
  },
);

export const CurrentRoomId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext().roomId as string;
  },
);
