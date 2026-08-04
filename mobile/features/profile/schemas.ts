import { z } from "zod";
import { BLOOD_GROUPS } from "../../constants/config";

// Height/weight stay strings at the form layer (TextInput only ever produces
// strings) and are converted to numbers at the submission boundary — using
// z.coerce here confuses @hookform/resolvers' input/output type inference
// with zod v4's stricter coercion typing.
function optionalPositiveNumberString(max: number, label: string) {
  return z
    .string()
    .optional()
    .refine((value) => !value || (Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= max), {
      message: `Enter a valid ${label} up to ${max}`,
    });
}

export const profileFormSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  heightCm: optionalPositiveNumberString(300, "height (cm)"),
  weightKg: optionalPositiveNumberString(500, "weight (kg)"),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
