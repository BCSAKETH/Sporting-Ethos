import { z } from "zod";

export const bookingSchema = z.object({
  reasonForVisit: z
    .string()
    .min(3, "Briefly describe the reason for your visit")
    .max(500, "Keep it under 500 characters"),
});
export type BookingFormValues = z.infer<typeof bookingSchema>;
