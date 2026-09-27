"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StatusAlertsProps {
  activeCount: number;
  suspendedCount: number;
  isChecking: boolean;
}

export function StatusAlerts({ activeCount, suspendedCount }: StatusAlertsProps) {
  const [showActive, setShowActive] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);
  const [displayedActive, setDisplayedActive] = useState(0);
  const [displayedSuspended, setDisplayedSuspended] = useState(0);

  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suspendedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCountRef = useRef(activeCount);
  const suspendedCountRef = useRef(suspendedCount);

  useEffect(() => {
    if (activeCount <= 0) return;
    activeCountRef.current = activeCount;
    // setState inside a setTimeout callback — allowed by the lint rule
    const t = setTimeout(() => {
      setDisplayedActive(activeCountRef.current);
      setShowActive(true);
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
      activeTimerRef.current = setTimeout(() => setShowActive(false), 3000);
    }, 0);
    return () => clearTimeout(t);
  }, [activeCount]);

  useEffect(() => {
    if (suspendedCount <= 0) return;
    suspendedCountRef.current = suspendedCount;
    const t = setTimeout(() => {
      setDisplayedSuspended(suspendedCountRef.current);
      setShowSuspended(true);
      if (suspendedTimerRef.current) clearTimeout(suspendedTimerRef.current);
      suspendedTimerRef.current = setTimeout(() => setShowSuspended(false), 3000);
    }, 0);
    return () => clearTimeout(t);
  }, [suspendedCount]);

  useEffect(() => {
    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
      if (suspendedTimerRef.current) clearTimeout(suspendedTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed top-3 right-3 z-[100] flex flex-col gap-2 w-[260px] sm:w-72 pointer-events-none">
      <AnimatePresence>
        {showActive && (
          <motion.div
            key="active-toast"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-emerald-800/60 bg-zinc-950 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1 text-emerald-300 font-medium text-xs leading-tight">
              {displayedActive} {displayedActive === 1 ? "user" : "users"} active
            </span>
            <button
              onClick={() => setShowActive(false)}
              className="shrink-0 p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {showSuspended && (
          <motion.div
            key="suspended-toast"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-rose-800/60 bg-zinc-950 shadow-lg"
          >
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1 text-rose-300 font-medium text-xs leading-tight">
              {displayedSuspended} {displayedSuspended === 1 ? "user" : "users"} suspended
            </span>
            <button
              onClick={() => setShowSuspended(false)}
              className="shrink-0 p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
