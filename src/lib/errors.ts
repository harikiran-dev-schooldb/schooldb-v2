export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// lib/errors.ts

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}