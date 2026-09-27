"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCheck } from "lucide-react";

interface CheckDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  usernames: string[];
  onConfirm: () => void;
}

export function CheckDialog({
  isOpen,
  onOpenChange,
  usernames,
  onConfirm,
}: CheckDialogProps) {
  const handleConfirm = () => {
    onOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 p-4 sm:p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Ready to Check?
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 px-1">
            Extracted Usernames
          </div>
          <div className="max-h-56 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700">
            {usernames.map((name, index) => (
              <div
                key={`${name}-${index}`}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm bg-zinc-800/40 border border-zinc-800/60 hover:bg-zinc-800/80 transition-colors"
              >
                <span className="text-xs font-mono text-zinc-500 w-6 text-right select-none">
                  {index + 1}.
                </span>
                <span className="font-mono text-zinc-200 truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogDescription className="text-zinc-400 mt-2 pl-1 text-xs sm:text-sm">
          <span className="font-semibold text-zinc-200">
            {usernames.length}{" "}
            {usernames.length === 1 ? "username" : "usernames"}
          </span>{" "}
          found and queued for verification.
        </DialogDescription>

        <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto hover:bg-zinc-800 text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
