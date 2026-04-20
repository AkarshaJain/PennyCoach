"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Sparkles, AlertTriangle, Coins, ShieldAlert, TrendingUp, PartyPopper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/lib/advisor/types";

const KIND_ICON: Record<Recommendation["kind"], React.ComponentType<{ className?: string }>> = {
  SAVE: Coins,
  CAP: AlertTriangle,
  WARN: ShieldAlert,
  PLAN: Sparkles,
  INSIGHT: TrendingUp,
  POSITIVE: PartyPopper,
};

const SEVERITY_STYLE = {
  HIGH: "border-destructive/40 bg-destructive/5",
  MEDIUM: "border-warning/40 bg-warning/5",
  LOW: "border-border bg-card",
} as const;

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = React.useState(false);
  const Icon = KIND_ICON[rec.kind];
  return (
    <Card className={cn("overflow-hidden transition-shadow", SEVERITY_STYLE[rec.severity])}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 flex-none items-center justify-center rounded-lg",
              rec.kind === "POSITIVE"
                ? "bg-success/15 text-success"
                : rec.severity === "HIGH"
                  ? "bg-destructive/15 text-destructive"
                  : rec.severity === "MEDIUM"
                    ? "bg-warning/15 text-warning"
                    : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{rec.title}</h3>
              <Badge
                variant={
                  rec.severity === "HIGH"
                    ? "destructive"
                    : rec.severity === "MEDIUM"
                      ? "warning"
                      : rec.kind === "POSITIVE"
                        ? "success"
                        : "secondary"
                }
                className="text-[10px] uppercase"
              >
                {rec.severity}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{rec.body}</p>

            {open && (
              <ul className="mt-3 space-y-1 rounded-lg bg-background/60 p-3 text-xs text-muted-foreground">
                {rec.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpen((o) => !o)}
                className="h-7 px-2 text-xs"
              >
                {open ? (
                  <>
                    Hide math <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Why this? <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </Button>
              {rec.action && (
                <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                  <Link href={rec.action.href}>{rec.action.label}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
