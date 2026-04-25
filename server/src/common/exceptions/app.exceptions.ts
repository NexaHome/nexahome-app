import { HttpException, HttpStatus } from '@nestjs/common';

// Base custom exception
export class AppException extends HttpException {
  constructor(message: string, statusCode: HttpStatus, public readonly errorCode: string) {
    super({ message, errorCode, statusCode }, statusCode);
  }
}

// ── Auth Errors ──────────────────────────────────────────
export class InvalidCredentialsException extends AppException {
  constructor() {
    super('Email or password is incorrect', HttpStatus.UNAUTHORIZED, 'AUTH_INVALID_CREDENTIALS');
  }
}

export class EmailAlreadyExistsException extends AppException {
  constructor() {
    super('Email is already registered', HttpStatus.CONFLICT, 'AUTH_EMAIL_ALREADY_EXISTS');
  }
}

export class TokenExpiredException extends AppException {
  constructor() {
    super('Access token has expired', HttpStatus.UNAUTHORIZED, 'AUTH_TOKEN_EXPIRED');
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'You are not authorized to access this resource') {
    super(message, HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHORIZED');
  }
}

// ── User Errors ──────────────────────────────────────────
export class UserNotFoundException extends AppException {
  constructor() {
    super('User not found', HttpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }
}

// ── Validation Errors ────────────────────────────────────
export class ValidationException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR');
  }
}

// ── Server Errors ────────────────────────────────────────
export class DatabaseException extends AppException {
  constructor(message = 'A database error occurred') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
  }
}
