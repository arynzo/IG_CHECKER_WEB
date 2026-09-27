"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Lock,
  Grid,
  Users,
  UserPlus,
} from "lucide-react";
import type { CheckResult } from "@/lib/instagram";

interface UserDetailDialogProps {
  user: CheckResult | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
}

export function UserDetailDialog({ user, isOpen, onOpenChange }: UserDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!user || user.status !== "active") return null;

  const profile = user.profile;
  // Always show fullName as title; if empty fall back to "(No name)" so @username stays separate
  const fullName = profile?.fullName?.trim() || "(No name)";
  const posts = profile?.mediaCount ?? 0;
  const followers = profile?.followerCount ?? 0;
  const following = profile?.followingCount ?? 0;
  const bio = profile?.biography?.trim();

  const handleCopyUsername = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(user.username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 p-4 sm:p-6 rounded-2xl shadow-2xl">
        <div className="space-y-5 pr-2">
          {/* Header: Avatar · Full Name · @username */}
          <div className="flex items-start gap-3 sm:gap-4 pr-8">
            <div className="relative shrink-0">
              {profile?.profilePicUrl && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profilePicUrl}
                  alt={user.username}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-zinc-800 bg-zinc-900 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center text-lg sm:text-xl font-bold text-zinc-300">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Full Name as dialog title */}
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-100 truncate">
                {fullName}
              </DialogTitle>

              {/* @username + copy + badges on the next line */}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="font-mono text-xs sm:text-sm text-zinc-400">
                  @{user.username}
                </span>

                <button
                  type="button"
                  onClick={handleCopyUsername}
                  title="Copy username"
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {profile?.isVerified && (
                  <Badge variant="outline" className="border-blue-700/60 bg-blue-950/40 text-blue-300 text-[10px] px-1.5 py-0 h-4 gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                    Verified
                  </Badge>
                )}

                {profile?.isPrivate && (
                  <Badge variant="outline" className="border-amber-700/60 bg-amber-950/40 text-amber-300 text-[10px] px-1.5 py-0 h-4 gap-0.5">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    Private
                  </Badge>
                )}
              </div>


            </div>
          </div>

          {/* Stats — compact number only, no duplicate exact number */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <Grid className="w-3 h-3" />
                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">Posts</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-zinc-100">
                {formatNumber(posts)}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <Users className="w-3 h-3" />
                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">Followers</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-zinc-100">
                {formatNumber(followers)}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <UserPlus className="w-3 h-3" />
                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">Following</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-zinc-100">
                {formatNumber(following)}
              </div>
            </div>
          </div>

          {/* Biography */}
          {bio && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 space-y-1">
              <div className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Biography
              </div>
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed font-sans max-h-36 overflow-y-auto pr-1">
                {bio}
              </p>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-1 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs h-9 px-4 border-zinc-800 hover:bg-zinc-800"
            >
              Close
            </Button>
            <a
              href={`https://instagram.com/${encodeURIComponent(user.username)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full sm:w-auto h-9 px-4 text-xs font-medium rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors gap-1.5"
            >
              <span>Open Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
