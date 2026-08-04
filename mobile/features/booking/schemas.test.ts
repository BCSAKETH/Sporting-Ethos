import { bookingSchema } from "./schemas";

describe("bookingSchema", () => {
  it("accepts a reasonable reason for visit", () => {
    expect(bookingSchema.safeParse({ reasonForVisit: "Follow-up for hypertension" }).success).toBe(true);
  });

  it("rejects a reason that's too short", () => {
    expect(bookingSchema.safeParse({ reasonForVisit: "hi" }).success).toBe(false);
  });

  it("rejects a reason over 500 characters", () => {
    expect(bookingSchema.safeParse({ reasonForVisit: "a".repeat(501) }).success).toBe(false);
  });
});
