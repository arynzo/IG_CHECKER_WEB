"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  total: number;
  isChecking: boolean;
}

export function ProgressBar({ current, total, isChecking }: ProgressBarProps) {
  if (!isChecking && total === 0) return null;

  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-lg space-y-2">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          {isChecking && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-300"></span>
            </span>
          )}
          <span className="font-medium text-zinc-200">
            {isChecking
              ? `Checking ${current} / ${total}`
              : `Completed ${current} of ${total} usernames`}
          </span>
        </div>
        <span className="font-mono text-zinc-400 font-semibold">{percentage}%</span>
      </div>

      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            isChecking
              ? "bg-zinc-100 animate-pulse"
              : "bg-emerald-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
