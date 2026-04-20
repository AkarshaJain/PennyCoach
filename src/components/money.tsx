import { formatMoney, type FormatMoneyOptions } from "@/lib/money";
import { cn } from "@/lib/utils";

interface MoneyProps extends FormatMoneyOptions {
  paise: number;
  className?: string;
  colored?: boolean;
}

export function Money({ paise, className, colored, ...opts }: MoneyProps) {
  const positive = paise >= 0;
  return (
    <span
      className={cn(
        "number",
        colored && (positive ? "text-success" : "text-destructive"),
        className,
      )}
    >
      {formatMoney(paise, opts)}
    </span>
  );
}
