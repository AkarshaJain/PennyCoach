import { z } from "zod";

const isoDate = z
  .string()
  .min(1, "Date is required")
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" });

const positiveAmountRupees = z
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be finite")
  .positive("Amount must be greater than zero");

export const PAYMENT_METHODS = [
  "DEBIT_CARD",
  "CREDIT_CARD",
  "CASH",
  "CHECK",
  "ACH",
  "AUTOPAY",
  "ZELLE",
  "VENMO",
  "PAYPAL",
  "APPLE_PAY",
  "GOOGLE_PAY",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  DEBIT_CARD: "Debit card",
  CREDIT_CARD: "Credit card",
  CASH: "Cash",
  CHECK: "Check",
  ACH: "ACH / Bank transfer",
  AUTOPAY: "Autopay",
  ZELLE: "Zelle",
  VENMO: "Venmo",
  PAYPAL: "PayPal",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  OTHER: "Other",
};

export function prettyPaymentMethod(
  method: string | null | undefined,
): string {
  if (!method) return "";
  return (PAYMENT_METHOD_LABELS as Record<string, string>)[method] ?? method;
}

export const transactionSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: positiveAmountRupees,
  date: isoDate,
  categoryId: z.string().min(1, "Pick a category").nullable().optional(),
  note: z.string().max(500).optional().nullable(),
  merchant: z.string().max(120).optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  tags: z.array(z.string().min(1).max(32)).max(10).optional(),
  isRecurring: z.boolean().optional(),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const budgetSchema = z.object({
  categoryId: z.string().min(1),
  amount: positiveAmountRupees,
  periodMonth: isoDate,
});
export type BudgetInput = z.infer<typeof budgetSchema>;

export const budgetBulkSchema = z.object({
  periodMonth: isoDate,
  items: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        amount: z.number().min(0).finite(),
      }),
    )
    .min(1),
});
export type BudgetBulkInput = z.infer<typeof budgetBulkSchema>;

export const futurePlanSchema = z.object({
  name: z.string().min(1).max(120),
  targetAmount: positiveAmountRupees,
  savedAmount: z.number().min(0).default(0),
  targetDate: isoDate,
  priority: z.number().int().min(1).max(5).default(3),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "DONE", "ABANDONED"]).default("ACTIVE"),
});
export type FuturePlanInput = z.infer<typeof futurePlanSchema>;

export const recurringBillSchema = z.object({
  name: z.string().min(1).max(120),
  categoryId: z.string().nullable().optional(),
  amount: positiveAmountRupees,
  frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  nextDueDate: isoDate,
  type: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
  autoPay: z.boolean().default(false),
  active: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});
export type RecurringBillInput = z.infer<typeof recurringBillSchema>;

export const goalSchema = z.object({
  name: z.string().min(1).max(120),
  targetAmount: positiveAmountRupees,
  savedAmount: z.number().min(0).default(0),
  targetDate: isoDate.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "DONE"]).default("ACTIVE"),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const profileSchema = z.object({
  name: z.string().max(120).optional().nullable(),
  currency: z.string().length(3).default("USD"),
  locale: z.string().default("en-US"),
  monthlyIncome: z.number().min(0).finite(),
  salaryCycle: z.enum(["MONTHLY", "WEEKLY", "IRREGULAR"]).default("MONTHLY"),
  savingsTargetPct: z.number().int().min(0).max(90).default(20),
  emergencyFundTargetMos: z.number().int().min(0).max(24).default(6),
  emergencyFundCurrent: z.number().min(0).finite().default(0),
  fixedExpensesNote: z.string().max(500).optional().nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const onboardingSchema = profileSchema.extend({
  seedDemo: z.boolean().default(false),
  initialPlans: z
    .array(
      z.object({
        name: z.string().min(1),
        targetAmount: z.number().positive(),
        targetDate: isoDate,
        priority: z.number().int().min(1).max(5).default(3),
      }),
    )
    .optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const importCommitSchema = z.object({
  batchName: z.string().min(1).max(120),
  sourceLabel: z.string().min(1).max(60),
  rows: z
    .array(
      z.object({
        externalId: z.string().nullable().optional(),
        type: z.enum(["EXPENSE", "INCOME"]),
        amount: positiveAmountRupees,
        date: isoDate,
        merchant: z.string().max(120).optional().nullable(),
        note: z.string().max(500).optional().nullable(),
        paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
        categorySlug: z.string().max(60).optional().nullable(),
      }),
    )
    .min(1)
    .max(5000),
});
export type ImportCommitInput = z.infer<typeof importCommitSchema>;
