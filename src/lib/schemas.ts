import { z } from "zod";
import {
  BARANGAYS,
  CAMPAIGN_CHANNELS,
  CUSTOMER_TYPES,
  PAYMENT_METHODS,
} from "../types";

/**
 * Form values arrive as strings from inputs, so numeric fields validate the
 * raw string first (giving a required-field message) and then coerce.
 */
function text(label: string, max = 120) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);
}

function decimal(label: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .pipe(z.coerce.number())
    .refine((value) => Number.isFinite(value), `${label} must be a number.`)
    .refine((value) => value >= min, `${label} cannot be less than ${min}.`)
    .refine((value) => value <= max, `${label} cannot be more than ${max}.`);
}

function whole(label: string, min = 1, max = Number.MAX_SAFE_INTEGER) {
  return decimal(label, min, max).refine(
    (value) => Number.isInteger(value),
    `${label} must be a whole number.`,
  );
}

export const customerFormSchema = z.object({
  name: text("Customer name"),
  barangay: z.enum(BARANGAYS, { message: "Choose a Cordova barangay." }),
  type: z.enum(CUSTOMER_TYPES, { message: "Choose a valid customer type." }),
});

export const serviceFormSchema = z.object({
  name: text("Service name", 80),
  unitLabel: text("Unit label", 20),
  price: decimal("Price"),
  cost: decimal("Cost"),
  machineHoursPerUnit: decimal("Machine hours"),
});

export const orderFormSchema = z.object({
  serviceId: z.string().min(1, "Choose a service."),
  week: whole("Week", 1, 48),
  units: whole("Units", 1),
});

export const paymentFormSchema = z.object({
  orderId: z.string().min(1, "Choose an order."),
  method: z.enum(PAYMENT_METHODS, { message: "Choose Cash, GCash or Maya." }),
});

export const machineUsageFormSchema = z
  .object({
    day: whole("Day", 1, 60),
    hoursAvailable: decimal("Available hours", 0, 24),
    hoursUsed: decimal("Used hours", 0, 24),
  })
  .refine((value) => value.hoursUsed <= value.hoursAvailable, {
    path: ["hoursUsed"],
    message: "Used hours cannot exceed available hours.",
  });

export const marketingFormSchema = z.object({
  channel: z.enum(CAMPAIGN_CHANNELS, { message: "Choose a campaign channel." }),
  cost: decimal("Cost"),
  leads: whole("Leads", 0),
});

export type FormResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/** Validates a string-keyed form and flattens Zod issues to one message per field. */
export function validateForm(
  schema: z.ZodType,
  values: Record<string, string>,
): FormResult {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data as Record<string, unknown> };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
