import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatTile({ label, value, hint, icon, trend, className }: StatTileProps) {
  return (
    <Card className={cn("card-hover", className)}>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="uppercase tracking-wide">{label}</span>
          {icon && <span className="text-muted-foreground/70">{icon}</span>}
        </div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {(hint || trend) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span className={cn(trend.positive ? "text-success" : "text-destructive")}>
                {trend.value}
              </span>
            )}
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
