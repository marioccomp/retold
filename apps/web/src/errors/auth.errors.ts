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
