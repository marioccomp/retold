export { userRepository } from "@repo/database";
import { User } from "@repo/database";

export type UpdatableProfileFields = Pick<
  User,
  | "name"
  | "username"
  | "bio"
  | "title"
  | "githubUrl"
  | "linkedinUrl"
  | "websiteUrl"
  | "longBio"
  | "skills"
  | "phone"
  | "email"
  | "contactEmail"
>;
export type UpdateProfileInput = Partial<UpdatableProfileFields>;
