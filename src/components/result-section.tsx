"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, UserCheck, UserX, AlertTriangle } from "lucide-react";
import type { CheckResult } from "@/lib/instagram";

interface ResultCardProps {
  type: "active" | "suspended" | "error";
  title: string;
  items: Array<string | CheckResult>;
  emptyText: string;
}

function SingleResultCard({ type, title, items, emptyText }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  // Extract raw usernames only (no emojis) for clipboard
  const usernamesOnly = items.map((item) =>
    typeof item === "string" ? item : item.username
  );

  const handleCopy = async () => {
    if (usernamesOnly.length === 0) return;
    try {
      await navigator.clipboard.writeText(usernamesOnly.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      const textarea = document.createElement("textarea");
      textarea.value = usernamesOnly.join("\n");
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStyleConfig = () => {
    switch (type) {
      case "active":
        return {
          icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
          badgeVariant: "success" as const,
          borderColor: "border-emerald-900/40 hover:border-emerald-800/60",
          headerBg: "bg-emerald-950/20",
          emoji: "🟢",
          tagColor: "text-emerald-400",
        };
      case "suspended":
        return {
          icon: <UserX className="w-4 h-4 text-rose-400" />,
          badgeVariant: "destructive" as const,
          borderColor: "border-rose-900/40 hover:border-rose-800/60",
          headerBg: "bg-rose-950/20",
          emoji: "🔴",
          tagColor: "text-rose-400",
        };
      case "error":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          badgeVariant: "warning" as const,
          borderColor: "border-amber-900/40 hover:border-amber-800/60",
          headerBg: "bg-amber-950/20",
          emoji: "⚠️",
          tagColor: "text-amber-400",
        };
    }
  };

  const config = getStyleConfig();

  return (
    <Card
      className={`border transition-all duration-200 bg-zinc-900/40 ${config.borderColor} flex flex-col h-full`}
    >
      <CardHeader className={`py-3.5 px-4 sm:px-5 border-b border-zinc-800/70 ${config.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className="text-base font-semibold text-zinc-100">
              {title}
            </CardTitle>
            <Badge variant={config.badgeVariant} className="font-mono text-xs">
              {items.length}
            </Badge>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={items.length === 0}
            className="h-8 px-2.5 text-xs gap-1.5 border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-200"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
        {items.length === 0 ? (
          <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
            <span className="text-2xl mb-2 opacity-40">{config.emoji}</span>
            <p className="text-sm text-zinc-500 font-medium">{emptyText}</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {items.map((item, idx) => {
              const username = typeof item === "string" ? item : item.username;
              const errorMsg = typeof item !== "string" ? item.error : undefined;

              return (
                <div
                  key={`${username}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-zinc-950/40 border border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm select-none" aria-hidden="true">
                      {config.emoji}
                    </span>
                    <span className="font-mono text-zinc-200 truncate select-text">
                      {username}
                    </span>
                  </div>

                  {errorMsg && (
                    <span className="text-xs text-amber-400/90 truncate max-w-[200px] ml-2 text-right">
                      {errorMsg}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ResultsContainerProps {
  activeList: string[];
  suspendedList: string[];
  errorList: CheckResult[];
}

export function ResultsSection({
  activeList,
  suspendedList,
  errorList,
}: ResultsContainerProps) {
  const hasErrors = errorList.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Section */}
        <SingleResultCard
          type="active"
          title="Active"
          items={activeList}
          emptyText="No active usernames yet."
        />

        {/* Suspended Section */}
        <SingleResultCard
          type="suspended"
          title="Suspended"
          items={suspendedList}
          emptyText="No suspended usernames yet."
        />
      </div>

      {/* Errors Section (only shown when errors occur to keep primary UI focused) */}
      {hasErrors && (
        <div className="mt-4">
          <SingleResultCard
            type="error"
            title="Errors / Issues"
            items={errorList}
            emptyText="No technical errors encountered."
          />
        </div>
      )}
    </div>
  );
}
