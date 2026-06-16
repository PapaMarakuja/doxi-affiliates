import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  bg?: string;
  color?: string;
  dotColor?: string;
}

export function Badge({ children, bg, color, dotColor, style, ...props }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "100px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: bg || "var(--hover)",
        color: color || "var(--text-muted)",
        width: "fit-content",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...props}
    >
      {dotColor && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
