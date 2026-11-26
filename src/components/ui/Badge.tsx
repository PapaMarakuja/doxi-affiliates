import React from "react";
import { cn } from "@/src/lib/utils";

export type BadgeTone = "neutral" | "brand" | "success" | "info" | "warning" | "danger" | "commission";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ children, tone = "neutral", dot = false, className, ...props }: BadgeProps) {
  return (
    <span className={cn("ui-badge", tone !== "neutral" && `ui-badge--${tone}`, className)} {...props}>
      {dot && <span className="ui-badge-dot" />}
      {children}
    </span>
  );
}
