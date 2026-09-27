"use client";

import React, { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Play,
  Sparkles,
  Trash2,
  AlertCircle,
  User,
  ClipboardPaste,
  Check,
} from "lucide-react";
import { parseUsernames } from "@/lib/username-parser";

interface UsernameInputProps {
  input: string;
  onChange: (value: string) => void;
  onStartChecking: (parsedUsernames: string[]) => void;
  isChecking: boolean;
}

const SAMPLE_INPUT = `USERNAME = arynzo
USERNAME: cristiano
username - nike
user = instagram

user1
user2
user3
`;

export function UsernameInput({
  input,
  onChange,
  onStartChecking,
  isChecking,
}: UsernameInputProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pasteDone, setPasteDone] = useState(false);
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
      setValidationError(
        "No valid usernames found. Please check your input format.",
      );
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

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      // Append to existing input (or set directly if empty)
      onChange(input ? input + "\n" + text : text);
      setValidationError(null);
      setPasteDone(true);
      setTimeout(() => setPasteDone(false), 1500);
    } catch {
      // Clipboard API blocked — focus the textarea so the user can Ctrl+V manually
      document.getElementById(textareaId)?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={textareaId}
          className="text-sm font-semibold text-zinc-200"
        >
          Instagram Usernames Input
        </label>

        {/* Right side: Sample · Clear · [parsed count] */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLoadSample}
            disabled={isChecking}
            className="h-7 text-xs text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 gap-1 px-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sample
          </Button>

          {input && (
            <>
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

              {parsedUsernames.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 rounded-md px-1.5 py-0.5 leading-none whitespace-nowrap">
                  <User className="w-2.5 h-2.5" />
                  {parsedUsernames.length}
                </span>
              )}
            </>
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

        {/* Bottom bar: hint · line count · paste button */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800/60 text-xs text-zinc-500">
          <span className="hidden sm:block">
            Supports plain lines, prefix formats, and deduplication
          </span>
          <span className="sm:hidden">Plain lines &amp; prefix formats</span>

          <div className="flex items-center gap-2.5 shrink-0 ml-2">
            <span>{lineCount} {lineCount === 1 ? "line" : "lines"}</span>

            {/* Paste button — sits flush in the bottom bar, never overlaps textarea */}
            <button
              type="button"
              onClick={handlePaste}
              disabled={isChecking}
              title="Paste from clipboard"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors duration-150 disabled:opacity-40
                border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600"
            >
              {pasteDone ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Pasted</span>
                </>
              ) : (
                <>
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Paste</span>
                </>
              )}
            </button>
          </div>
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
