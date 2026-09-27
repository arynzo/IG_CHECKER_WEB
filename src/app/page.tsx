"use client";

import React, { useState, useRef } from "react";
import { UsernameInput } from "@/components/username-input";
import { CheckDialog } from "@/components/check-dialog";
import { ResultsSection } from "@/components/result-section";
import { ProgressBar } from "@/components/progress-bar";
import type { CheckResult } from "@/lib/instagram";

export default function HomePage() {
  const [inputText, setInputText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [queuedUsernames, setQueuedUsernames] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const [activeList, setActiveList] = useState<string[]>([]);
  const [suspendedList, setSuspendedList] = useState<string[]>([]);
  const [errorList, setErrorList] = useState<CheckResult[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Triggered when user clicks "Start Checking" in the input form
  const handleOpenConfirm = (usernames: string[]) => {
    setQueuedUsernames(usernames);
    setIsDialogOpen(true);
  };

  // Triggered when user confirms "Check" in the dialog
  const handleStartChecking = async () => {
    if (queuedUsernames.length === 0) return;

    // Reset results for the new run
    setActiveList([]);
    setSuspendedList([]);
    setErrorList([]);
    setProgress({ current: 0, total: queuedUsernames.length });
    setIsChecking(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/check-usernames", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/x-ndjson, application/json",
        },
        body: JSON.stringify({
          usernames: queuedUsernames,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = `Server returned status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          // ignore json parse error
        }

        setErrorList(
          queuedUsernames.map((u) => ({
            username: u,
            status: "error",
            error: errorMsg,
          }))
        );
        setIsChecking(false);
        return;
      }

      // Handle streaming NDJSON response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let count = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // The last element is either empty or an incomplete line
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const item = JSON.parse(trimmed) as CheckResult;
              count++;
              setProgress({ current: count, total: queuedUsernames.length });

              if (item.status === "active") {
                setActiveList((prev) => [...prev, item.username]);
              } else if (item.status === "suspended") {
                setSuspendedList((prev) => [...prev, item.username]);
              } else {
                setErrorList((prev) => [...prev, item]);
              }
            } catch {
              // Ignore malformed chunk lines
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const item = JSON.parse(buffer.trim()) as CheckResult;
            count++;
            setProgress({ current: count, total: queuedUsernames.length });

            if (item.status === "active") {
              setActiveList((prev) => [...prev, item.username]);
            } else if (item.status === "suspended") {
              setSuspendedList((prev) => [...prev, item.username]);
            } else {
              setErrorList((prev) => [...prev, item]);
            }
          } catch {
            // Ignore
          }
        }
      } else {
        // Fallback for non-streaming response
        const data = await response.json();
        const results = (data.results || []) as CheckResult[];
        const actives: string[] = [];
        const suspended: string[] = [];
        const errors: CheckResult[] = [];

        for (const item of results) {
          if (item.status === "active") {
            actives.push(item.username);
          } else if (item.status === "suspended") {
            suspended.push(item.username);
          } else {
            errors.push(item);
          }
        }

        setActiveList(actives);
        setSuspendedList(suspended);
        setErrorList(errors);
        setProgress({ current: results.length, total: results.length });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User aborted
        return;
      }
      setErrorList(
        queuedUsernames.map((u) => ({
          username: u,
          status: "error",
          error: err instanceof Error ? err.message : "Failed to connect to server",
        }))
      );
    } finally {
      setIsChecking(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl opacity-70" />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header Section */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Real-time Status Checker</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Next.js 16</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Instagram Username Checker
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
            Check usernames quickly. Paste lines with prefixes or plain text to detect Active and Suspended accounts.
          </p>
        </header>

        {/* Input & Form Card */}
        <section className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-7 backdrop-blur-md shadow-2xl shadow-black/40">
          <UsernameInput
            input={inputText}
            onChange={setInputText}
            onStartChecking={handleOpenConfirm}
            isChecking={isChecking}
          />
        </section>

        {/* Progress Bar (visible during checking or after completion) */}
        {(isChecking || progress.total > 0) && (
          <section className="animate-in fade-in slide-in-from-top-2 duration-300">
            <ProgressBar
              current={progress.current}
              total={progress.total}
              isChecking={isChecking}
            />
          </section>
        )}

        {/* Results Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <span>Results</span>
              {(activeList.length > 0 || suspendedList.length > 0 || errorList.length > 0) && (
                <span className="text-xs text-zinc-500 font-normal">
                  ({activeList.length + suspendedList.length + errorList.length} total)
                </span>
              )}
            </h2>
          </div>

          <ResultsSection
            activeList={activeList}
            suspendedList={suspendedList}
            errorList={errorList}
          />
        </section>
      </main>

      {/* Confirmation Dialog */}
      <CheckDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        usernames={queuedUsernames}
        onConfirm={handleStartChecking}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <p>Instagram Username Checker • Server-side verification & controlled concurrency</p>
      </footer>
    </div>
  );
}
