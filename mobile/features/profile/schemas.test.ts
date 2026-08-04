import { profileFormSchema } from "./schemas";

describe("profileFormSchema", () => {
  it("accepts a minimal valid profile", () => {
    expect(profileFormSchema.safeParse({ fullName: "Jane Doe" }).success).toBe(true);
  });

  it("rejects a name that's too short", () => {
    expect(profileFormSchema.safeParse({ fullName: "J" }).success).toBe(false);
  });

  it("accepts numeric height/weight strings from text inputs", () => {
    const result = profileFormSchema.safeParse({ fullName: "Jane Doe", heightCm: "170", weightKg: "65" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.heightCm).toBe("170");
      expect(result.data.weightKg).toBe("65");
    }
  });

  it("treats an empty height/weight string as unset", () => {
    expect(profileFormSchema.safeParse({ fullName: "Jane Doe", heightCm: "" }).success).toBe(true);
  });

  it("rejects a non-numeric height", () => {
    expect(profileFormSchema.safeParse({ fullName: "Jane Doe", heightCm: "tall" }).success).toBe(false);
  });

  it("rejects an out-of-range height", () => {
    expect(profileFormSchema.safeParse({ fullName: "Jane Doe", heightCm: "999" }).success).toBe(false);
  });

  it("rejects an invalid blood group", () => {
    expect(profileFormSchema.safeParse({ fullName: "Jane Doe", bloodGroup: "Z+" }).success).toBe(false);
  });
});
