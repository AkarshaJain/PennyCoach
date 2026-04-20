import { cn } from "@/lib/utils";

interface ScoreRingProps {
  value: number;
  label: string;
  size?: number;
  suffix?: string;
  className?: string;
}

export function ScoreRing({ value, label, size = 92, suffix = "", className }: ScoreRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const tone =
    pct >= 75
      ? "text-success"
      : pct >= 50
        ? "text-primary"
        : pct >= 25
          ? "text-warning"
          : "text-destructive";
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
          className={tone}
        />
        <text
          x="50%"
          y="52%"
          textAnchor="middle"
          dominantBaseline="middle"
          className={cn("fill-current text-base font-semibold tabular-nums", tone)}
        >
          {Math.round(pct)}
          {suffix}
        </text>
      </svg>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
