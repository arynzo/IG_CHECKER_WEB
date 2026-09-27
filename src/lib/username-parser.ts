/**
 * Intelligent parser for extracting Instagram usernames from raw text and account dumps.
 * 
 * Supports:
 * - Plain lists of usernames (one per line)
 * - Explicitly labeled lines:
 *     USER - actualvalue
 *     USERNAME - actualvalue
 *     user- actualvalue
 *     user - actualvalue
 *     username- actualvalue
 *     username - actualvalue
 *     USERNAME = actualvalue
 *     USER = actualvalue
 *     USER=actualvalue
 *     user:actualvalue
 *     USER: actualvalue
 *     USER > actualvalue
 *     USERNAME > actualvalue
 *     USERNAME: actualvalue
 *     USERNAME actualvalue
 *     user actualvalue
 * - Complex account dumps with PASSWORD, EMAIL, SECRET, headers, and decorative lines.
 *   When explicit username labels are detected, non-username metadata is automatically ignored.
 */

// Matches prefixes like "USER -", "USERNAME =", "user:", "USER>", "username "
const USERNAME_PREFIX_REGEX =
  /^(?:username|user|ig_user|ig_username)(?:\s*[:=\->]\s*|\s+)(.+)$/i;

// Identifies non-username metadata lines in account dumps that should never be treated as usernames
const IGNORED_METADATA_REGEX =
  /^(?:password|pass|pwd|email|mail|secret|2fa|key|token|cookie|phone|proxy|ip|port|status|ig-\d+|ig\s*\d+|account|login)\b/i;

// Valid Instagram username specification: 1-30 chars, alphanumeric + dots + underscores
const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

function cleanExtracted(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();

  // Remove surrounding quotes or leading '@'
  clean = clean.replace(/^['"@]+|['"]+$/g, "").trim();

  // If there are space-separated extra fields or tokens, take the primary identifier
  const parts = clean.split(/\s+/);
  if (parts.length > 0) {
    clean = parts[0];
  }

  // Remove trailing punctuation that might come from sentence or copy-paste
  clean = clean.replace(/[,\s:;]+$/, "").trim();

  return clean;
}

export function parseUsernames(input: string): string[] {
  if (!input || typeof input !== "string") {
    return [];
  }

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Check if the input contains ANY explicit username labels (e.g. USERNAME - ..., USER: ...)
  const hasExplicitLabels = lines.some((line) => USERNAME_PREFIX_REGEX.test(line));

  const seen = new Set<string>();
  const results: string[] = [];

  for (const line of lines) {
    let candidate: string | null = null;

    const match = line.match(USERNAME_PREFIX_REGEX);
    if (match) {
      candidate = cleanExtracted(match[1]);
    } else if (!hasExplicitLabels) {
      // If NO explicit username labels exist in the entire text,
      // treat valid lines as usernames, while ignoring decorative and metadata lines
      if (
        !IGNORED_METADATA_REGEX.test(line) &&
        !line.includes("━") &&
        !line.includes("─") &&
        !line.includes("=")
      ) {
        candidate = cleanExtracted(line);
      }
    }

    if (candidate && INSTAGRAM_USERNAME_REGEX.test(candidate)) {
      const lower = candidate.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        results.push(candidate);
      }
    }
  }

  return results;
}
