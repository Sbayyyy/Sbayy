import * as React from "react";
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@sbay/shared";

const bubble = cva("grid place-items-center rounded-xl", {
  variants: {
    size: { sm: "h-9 w-9", md: "h-12 w-12", lg: "h-14 w-14" },
    accent: {
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
      violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
      orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
      green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
      gray: "bg-muted text-foreground/70 dark:bg-muted/40",
    },
  },
  defaultVariants: { size: "md", accent: "gray" },
});

const deltaBadge = cva("rounded-full px-3 py-1 text-xs font-medium", {
  variants: {
    trend: {
      up: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      down: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
      neutral: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: { trend: "neutral" },
});

export type StatCardProps = Omit<React.ComponentProps<typeof Card>, "children"> &
  VariantProps<typeof bubble> &
  VariantProps<typeof deltaBadge> & {
    title: React.ReactNode;
    value: React.ReactNode;
    icon?: React.ReactNode;
    delta?: number | string;
    formatDelta?: (d: number | string) => React.ReactNode;
    rightSlot?: React.ReactNode;
    footer?: React.ReactNode;
    badge?: React.ReactNode;
  };

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      icon,
      delta,
      formatDelta,
      rightSlot,
      footer,
      size,
      accent,
      trend,
      badge,
      className,
      ...cardProps
    },
    ref
  ) => {
    const computedTrend: "up" | "down" | "neutral" =
      trend ?? (typeof delta === "number" ? (delta > 0 ? "up" : delta < 0 ? "down" : "neutral") : "neutral");

    const contentDelta =
      badge ??
      (delta !== undefined && (
        <Badge className={deltaBadge({ trend: computedTrend })}>
          {typeof delta === "number"
            ? (formatDelta ? formatDelta(delta) : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`)
            : delta}
        </Badge>
      ));

    return (
      <Card ref={ref} className={cn("rounded-2xl border-muted shadow-sm", className)} {...cardProps}>
        <CardHeader className="flex-row items-start justify-between space-y-0 p-6">
          <div className="flex items-center gap-4">
            {icon ? <div className={bubble({ size, accent })}>{icon}</div> : null}
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">{title}</span>
              <span className="mt-1 text-3xl font-semibold tracking-tight">{value}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">{contentDelta}{rightSlot}</div>
        </CardHeader>
        {footer ? <CardContent className="p-6 pt-0">{footer}</CardContent> : null}
      </Card>
    );
  }
);

StatCard.displayName = "StatCard";

export default StatCard;