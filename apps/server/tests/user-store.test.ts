import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/user-store.js";

describe("user-store", () => {
  it("hashes passwords without accepting a different password", () => {
    const hash = hashPassword("password123");
    expect(verifyPassword("password123", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });
});
