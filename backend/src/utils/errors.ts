export class AppError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = "NOT_FOUND") {
    super(message, 404, code);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Tidak diizinkan.", code = "UNAUTHORIZED") {
    super(message, 403, code);
    this.name = "UnauthorizedError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Otentikasi gagal.", code = "AUTHENTICATION_FAILED") {
    super(message, 401, code);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = "VALIDATION_ERROR", status = 400) {
    super(message, status, code);
    this.name = "ValidationError";
  }
}
