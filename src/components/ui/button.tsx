import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "success";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variantStyles = {
      default:
        "bg-zinc-100 text-zinc-900 shadow hover:bg-zinc-200 active:scale-[0.98]",
      secondary:
        "bg-zinc-800 text-zinc-100 shadow-sm hover:bg-zinc-700 active:scale-[0.98]",
      outline:
        "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white active:scale-[0.98]",
      ghost:
        "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100 active:scale-[0.98]",
      destructive:
        "bg-red-950 text-red-200 border border-red-800/50 hover:bg-red-900 active:scale-[0.98]",
      success:
        "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 active:scale-[0.98]",
    }[variant];

    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-base font-semibold",
      icon: "h-9 w-9",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
