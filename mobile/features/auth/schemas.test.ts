import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "./schemas";

describe("loginSchema", () => {
  it("accepts a valid email + password", () => {
    expect(loginSchema.safeParse({ email: "patient@example.com", password: "secret1" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 6 characters", () => {
    const result = loginSchema.safeParse({ email: "patient@example.com", password: "123" });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  const base = { fullName: "Jane Doe", email: "jane@example.com", password: "secret1", confirmPassword: "secret1" };

  it("accepts matching passwords", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({ ...base, confirmPassword: "different" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("rejects mismatched new passwords", () => {
    const result = resetPasswordSchema.safeParse({ password: "abcdef", confirmPassword: "abcxyz" });
    expect(result.success).toBe(false);
  });
});
