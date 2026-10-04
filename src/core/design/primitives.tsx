import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export type FreshButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type FreshButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: FreshButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

export function FreshButton({ variant = "primary", loading = false, disabled, children, ...props }: FreshButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={["fresh-button", `fresh-button--${variant}`, props.className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}

type FreshIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

export function FreshIconButton({ label, size = "md", children, className, ...props }: FreshIconButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={["fresh-icon-button", `fresh-icon-button--${size}`, className].filter(Boolean).join(" ")}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function FreshSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["fresh-surface", className].filter(Boolean).join(" ")} />;
}

export function FreshText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={["fresh-text", className].filter(Boolean).join(" ")} />;
}

export function FreshInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={["fresh-input", className].filter(Boolean).join(" ")} />;
}
