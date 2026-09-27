import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "destructive" | "outline" | "warning";
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-zinc-800 text-zinc-200 border-zinc-700",
    secondary: "bg-zinc-800/60 text-zinc-400 border-zinc-700/50",
    success: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
    destructive: "bg-red-950/80 text-red-300 border-red-800/60",
    warning: "bg-amber-950/80 text-amber-300 border-amber-800/60",
    outline: "text-zinc-300 border-zinc-700",
  }[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
        variantStyles,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
