import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Card } from "@/src/components/ui/Card";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { cn } from "@/src/lib/utils";

export type MetricTone = "pink" | "green" | "blue" | "amber" | "red" | "purple" | "navy";

interface MetricCardProps {
  icon: IconDefinition;
  label: string;
  value: React.ReactNode;
  tone?: MetricTone;
  hint?: React.ReactNode;
  loading?: boolean;
  valueClassName?: string;
}

export function MetricCard({ icon, label, value, tone = "pink", hint, loading = false, valueClassName }: MetricCardProps) {
  return (
    <Card className="metric-card">
      <div className={`icon-tile stat-card-icon--${tone}`}>
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className="min-w-0">
        <div className="metric-label">{label}</div>
        <div className={cn("metric-value", valueClassName)}>
          {loading ? <Skeleton width="120px" height="32px" /> : value}
        </div>
        {hint && !loading && <div className="metric-hint">{hint}</div>}
      </div>
    </Card>
  );
}
