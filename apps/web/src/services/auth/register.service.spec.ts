import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUser } from "./register.service";

vi.mock("@repo/database", () => {
  return {
    userRepository: {
      findByEmailOrUsername: vi.fn(),
      create: vi.fn(),
    },
  };
});

import { userRepository } from "@repo/database";

describe("registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new user when data is valid", async () => {
    (userRepository.findByEmailOrUsername as any).mockResolvedValue(null);

    await registerUser({
      name: "John Doe",
      email: "john@email.com",
      username: "johndoe",
      password: "123456",
    });

    expect(userRepository.findByEmailOrUsername).toHaveBeenCalledWith("john@email.com", "johndoe");

    expect(userRepository.create).toHaveBeenCalledTimes(1);

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "john@email.com",
        username: "johndoe",
        password: expect.any(String),
      })
    );
  });

  it("should throw error if email already exists", async () => {
    (userRepository.findByEmailOrUsername as any).mockResolvedValue({
      email: "john@email.com",
      username: "other",
    });

    await expect(
      registerUser({
        name: "John",
        email: "john@email.com",
        username: "johndoe",
        password: "123456",
      })
    ).rejects.toThrow("E-mail already in use");
  });

  it("should throw error if username already exists", async () => {
    (userRepository.findByEmailOrUsername as any).mockResolvedValue({
      email: "other@email.com",
      username: "johndoe",
    });

    await expect(
      registerUser({
        name: "John",
        email: "john@email.com",
        username: "johndoe",
        password: "123456",
      })
    ).rejects.toThrow("Username already in use");
  });
});
