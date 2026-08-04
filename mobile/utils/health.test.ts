import { bmiCategory, calculateAge, calculateBmi } from "./health";

describe("calculateBmi", () => {
  it("matches the database's generated bmi formula", () => {
    // profiles.bmi = round(weight / (height_m ^ 2), 2) — see
    // supabase/migrations/20260803120002_profiles.sql
    expect(calculateBmi(170, 65)).toBeCloseTo(22.49, 2);
  });

  it("returns null when either input is missing or non-positive", () => {
    expect(calculateBmi(null, 65)).toBeNull();
    expect(calculateBmi(170, null)).toBeNull();
    expect(calculateBmi(0, 65)).toBeNull();
    expect(calculateBmi(170, -1)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it.each([
    [17, "Underweight"],
    [22, "Normal"],
    [27, "Overweight"],
    [32, "Obese"],
  ])("classifies %f as %s", (bmi, expected) => {
    expect(bmiCategory(bmi)).toBe(expected);
  });

  it("returns null for a missing bmi", () => {
    expect(bmiCategory(null)).toBeNull();
  });
});

describe("calculateAge", () => {
  it("computes whole years from a date of birth", () => {
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    expect(calculateAge(eighteenYearsAgo.toISOString().slice(0, 10))).toBe(18);
  });

  it("returns null for missing or invalid input", () => {
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge("not-a-date")).toBeNull();
  });
});
