export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("EMAIL_ALREADY_IN_USE");
  }
}

export class UsernameAlreadyInUseError extends Error {
  constructor() {
    super("USERNAME_ALREADY_IN_USE");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}

export class TooManyLoginAttemptsError extends Error {
  constructor() {
    super("Too many login attempts");
    this.name = "TooManyLoginAttemptsError";
  }
}

export class TooManyRequestsError extends Error {
  constructor() {
    super("Too many requests");
    this.name = "TooManyRequestsError";
  }
}
