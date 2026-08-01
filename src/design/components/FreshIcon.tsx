import React from "react";
import FreshIconTheme from "../icons/iconTheme";

interface FreshIconProps {
  children: React.ReactNode;
  color?: keyof typeof FreshIconTheme.colors;
}

export function FreshIcon({
  children,
  color = "default",
}: FreshIconProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        color: FreshIconTheme.colors[color],
        filter: `drop-shadow(0 0 8px ${FreshIconTheme.colors[color]}66)`,
      }}
    >
      {children}
    </span>
  );
}
