/**
 * US-first default category catalog. Each entry is tagged as FIXED, VARIABLE,
 * SAVINGS, or INCOME — the advisor treats fixed expenses differently from
 * variable ones when giving advice.
 */

export type CategoryKind = "FIXED" | "VARIABLE" | "SAVINGS" | "INCOME";

export interface SeedCategory {
  slug: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  // ---- INCOME ----
  { slug: "salary", name: "Salary / Paycheck", kind: "INCOME", icon: "Briefcase", color: "#10b981", sortOrder: 1 },
  { slug: "freelance", name: "Freelance / Side income", kind: "INCOME", icon: "Laptop", color: "#14b8a6", sortOrder: 2 },
  { slug: "interest", name: "Interest / Dividends", kind: "INCOME", icon: "PiggyBank", color: "#0ea5e9", sortOrder: 3 },
  { slug: "refund", name: "Refund / Reimbursement", kind: "INCOME", icon: "Undo2", color: "#06b6d4", sortOrder: 4 },
  { slug: "other-income", name: "Other income", kind: "INCOME", icon: "Coins", color: "#22c55e", sortOrder: 5 },

  // ---- FIXED ----
  { slug: "rent", name: "Rent / Mortgage", kind: "FIXED", icon: "Home", color: "#6366f1", sortOrder: 10 },
  { slug: "auto-loan", name: "Auto loan", kind: "FIXED", icon: "Car", color: "#4f46e5", sortOrder: 11 },
  { slug: "student-loan", name: "Student loan", kind: "FIXED", icon: "GraduationCap", color: "#4338ca", sortOrder: 12 },
  { slug: "insurance", name: "Insurance (auto/home/renters)", kind: "FIXED", icon: "Shield", color: "#7c3aed", sortOrder: 13 },
  { slug: "health-insurance", name: "Health insurance", kind: "FIXED", icon: "HeartPulse", color: "#e11d48", sortOrder: 13.1 },
  { slug: "credit-card-payment", name: "Credit card payment", kind: "FIXED", icon: "CreditCard", color: "#334155", sortOrder: 13.2 },
  { slug: "taxes", name: "Taxes (federal/state/local)", kind: "FIXED", icon: "FileText", color: "#78716c", sortOrder: 13.3 },
  { slug: "electricity", name: "Electricity", kind: "FIXED", icon: "Zap", color: "#eab308", sortOrder: 14 },
  { slug: "gas-utility", name: "Gas (utility)", kind: "FIXED", icon: "Flame", color: "#f59e0b", sortOrder: 15 },
  { slug: "water", name: "Water / Sewer / Trash", kind: "FIXED", icon: "Droplet", color: "#06b6d4", sortOrder: 16 },
  { slug: "internet", name: "Internet", kind: "FIXED", icon: "Wifi", color: "#0891b2", sortOrder: 17 },
  { slug: "phone", name: "Phone", kind: "FIXED", icon: "Smartphone", color: "#0ea5e9", sortOrder: 18 },
  { slug: "subscriptions", name: "Subscriptions", kind: "FIXED", icon: "PlayCircle", color: "#f43f5e", sortOrder: 19 },
  { slug: "childcare", name: "Childcare / Tuition", kind: "FIXED", icon: "Baby", color: "#8b5cf6", sortOrder: 20 },
  { slug: "hoa", name: "HOA / Property tax", kind: "FIXED", icon: "Building", color: "#64748b", sortOrder: 21 },
  { slug: "gym", name: "Gym / Membership", kind: "FIXED", icon: "Dumbbell", color: "#475569", sortOrder: 22 },

  // ---- VARIABLE ----
  { slug: "groceries", name: "Groceries", kind: "VARIABLE", icon: "ShoppingBasket", color: "#16a34a", sortOrder: 30 },
  { slug: "dining-out", name: "Dining out", kind: "VARIABLE", icon: "UtensilsCrossed", color: "#fb923c", sortOrder: 31 },
  { slug: "takeout", name: "Takeout / Delivery", kind: "VARIABLE", icon: "Bike", color: "#f97316", sortOrder: 32 },
  { slug: "coffee", name: "Coffee", kind: "VARIABLE", icon: "Coffee", color: "#a16207", sortOrder: 33 },
  { slug: "fuel", name: "Gas / Fuel", kind: "VARIABLE", icon: "Fuel", color: "#ef4444", sortOrder: 34 },
  { slug: "public-transit", name: "Public transit", kind: "VARIABLE", icon: "TramFront", color: "#0ea5e9", sortOrder: 35 },
  { slug: "rideshare", name: "Rideshare (Uber/Lyft)", kind: "VARIABLE", icon: "Car", color: "#3b82f6", sortOrder: 36 },
  { slug: "parking", name: "Parking / Tolls", kind: "VARIABLE", icon: "ParkingCircle", color: "#6366f1", sortOrder: 37 },
  { slug: "medical", name: "Medical / Pharmacy", kind: "VARIABLE", icon: "HeartPulse", color: "#e11d48", sortOrder: 38 },
  { slug: "shopping", name: "Shopping", kind: "VARIABLE", icon: "ShoppingBag", color: "#d946ef", sortOrder: 39 },
  { slug: "entertainment", name: "Entertainment", kind: "VARIABLE", icon: "Ticket", color: "#c026d3", sortOrder: 40 },
  { slug: "travel", name: "Travel", kind: "VARIABLE", icon: "Plane", color: "#8b5cf6", sortOrder: 41 },
  { slug: "gifts", name: "Gifts", kind: "VARIABLE", icon: "Gift", color: "#ec4899", sortOrder: 42 },
  { slug: "household", name: "Household", kind: "VARIABLE", icon: "Sofa", color: "#a16207", sortOrder: 43 },
  { slug: "home-maintenance", name: "Home maintenance / Repairs", kind: "VARIABLE", icon: "Wrench", color: "#78716c", sortOrder: 43.5 },
  { slug: "personal-care", name: "Personal care", kind: "VARIABLE", icon: "Sparkles", color: "#db2777", sortOrder: 44 },
  { slug: "pets", name: "Pets", kind: "VARIABLE", icon: "PawPrint", color: "#f59e0b", sortOrder: 45 },
  { slug: "charity", name: "Charity / Donations", kind: "VARIABLE", icon: "Heart", color: "#ef4444", sortOrder: 46 },
  { slug: "fees", name: "Fees / Bank charges", kind: "VARIABLE", icon: "Receipt", color: "#64748b", sortOrder: 47 },
  { slug: "other", name: "Other", kind: "VARIABLE", icon: "MoreHorizontal", color: "#94a3b8", sortOrder: 99 },

  // ---- SAVINGS ----
  { slug: "investments", name: "Brokerage / Investments", kind: "SAVINGS", icon: "TrendingUp", color: "#059669", sortOrder: 50 },
  { slug: "retirement", name: "Retirement (general)", kind: "SAVINGS", icon: "Landmark", color: "#047857", sortOrder: 51 },
  { slug: "retirement-401k", name: "401(k) contribution", kind: "SAVINGS", icon: "Briefcase", color: "#065f46", sortOrder: 51.1 },
  { slug: "retirement-ira", name: "IRA contribution (Trad/Roth)", kind: "SAVINGS", icon: "PiggyBank", color: "#0f766e", sortOrder: 51.2 },
  { slug: "hsa", name: "HSA / FSA", kind: "SAVINGS", icon: "Stethoscope", color: "#0891b2", sortOrder: 51.3 },
  { slug: "emergency-fund", name: "Emergency fund", kind: "SAVINGS", icon: "ShieldCheck", color: "#0d9488", sortOrder: 52 },
  { slug: "sinking-fund", name: "Sinking fund / Future plans", kind: "SAVINGS", icon: "PiggyBank", color: "#0ea5e9", sortOrder: 53 },
];

export function getCategoryBySlug(slug: string): SeedCategory | undefined {
  return DEFAULT_CATEGORIES.find((c) => c.slug === slug);
}

export const FIXED_CATEGORY_SLUGS = new Set(
  DEFAULT_CATEGORIES.filter((c) => c.kind === "FIXED").map((c) => c.slug),
);
export const SAVINGS_CATEGORY_SLUGS = new Set(
  DEFAULT_CATEGORIES.filter((c) => c.kind === "SAVINGS").map((c) => c.slug),
);
export const INCOME_CATEGORY_SLUGS = new Set(
  DEFAULT_CATEGORIES.filter((c) => c.kind === "INCOME").map((c) => c.slug),
);
