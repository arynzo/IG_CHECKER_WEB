"use client";

import React, { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Sparkles, Trash2, AlertCircle } from "lucide-react";
import { parseUsernames } from "@/lib/username-parser";

interface UsernameInputProps {
  input: string;
  onChange: (value: string) => void;
  onStartChecking: (parsedUsernames: string[]) => void;
  isChecking: boolean;
}

const SAMPLE_INPUT = `USERNAME: instagram
natgeo
USERNAME = cristiano
nike
USERNAME - this_user_does_not_exist_404xyz999
username taylor_swift_fake_suspended_abc123
instagram`;

export function UsernameInput({
  input,
  onChange,
  onStartChecking,
  isChecking,
}: UsernameInputProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaId = useId();

  const parsedUsernames = parseUsernames(input);
  const lineCount = input.trim() ? input.split(/\r?\n/).length : 0;

  const handleStart = () => {
    setValidationError(null);

    if (!input.trim()) {
      setValidationError("Please enter at least one username.");
      return;
    }

    if (parsedUsernames.length === 0) {
      setValidationError("No valid usernames found. Please check your input format.");
      return;
    }

    onStartChecking(parsedUsernames);
  };

  const handleLoadSample = () => {
    onChange(SAMPLE_INPUT);
    setValidationError(null);
  };

  const handleClear = () => {
    onChange("");
    setValidationError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={textareaId}
          className="text-sm font-semibold text-zinc-200 flex items-center gap-2"
        >
          <span>Instagram Usernames Input</span>
          {parsedUsernames.length > 0 && (
            <Badge variant="secondary" className="font-mono text-xs text-indigo-300 border-indigo-800/40">
              {parsedUsernames.length} {parsedUsernames.length === 1 ? "username" : "usernames"} parsed
            </Badge>
          )}
        </label>

        <div className="flex items-center gap-2 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLoadSample}
            disabled={isChecking}
            className="h-7 text-xs text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 gap-1 px-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Sample
          </Button>

          {input && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isChecking}
              className="h-7 text-xs text-zinc-400 hover:text-red-300 hover:bg-zinc-800 gap-1 px-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
        <textarea
          id={textareaId}
          value={input}
          onChange={(e) => {
            onChange(e.target.value);
            if (validationError) setValidationError(null);
          }}
          disabled={isChecking}
          rows={8}
          placeholder={`Paste usernames in any format:\n\nuser1\nuser2\nUSERNAME: user3\nUSERNAME = user4\nusername - user5\nusername user6`}
          className="w-full resize-y rounded-xl bg-transparent p-3.5 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-zinc-800"
          spellCheck={false}
          autoComplete="off"
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/60 text-xs text-zinc-500">
          <span>Supports plain lines, prefix formats, and deduplication</span>
          <span>{lineCount} {lineCount === 1 ? "line" : "lines"}</span>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="flex justify-center pt-1">
        <Button
          type="button"
          size="lg"
          onClick={handleStart}
          disabled={isChecking || parsedUsernames.length === 0}
          className="w-full sm:w-auto min-w-[200px] h-11 px-6 font-medium gap-2"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Start Checking</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
