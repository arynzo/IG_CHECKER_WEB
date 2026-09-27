/**
 * Server-side Instagram Username verification utility.
 * 
 * IMPORTANT: This module MUST ONLY be executed on the server.
 * Never import or execute this module in client components.
 */

export type CheckResultStatus = "active" | "suspended" | "error";

export interface UserProfileInfo {
  fullName?: string;
  mediaCount?: number;
  followerCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  profilePicUrl?: string;
  biography?: string;
}

export interface CheckResult {
  username: string;
  status: CheckResultStatus;
  error?: string;
  statusCode?: number;
  profile?: UserProfileInfo;
}

const REQUEST_TIMEOUT_MS = 10000;

/**
 * Safely parses Instagram response stream which may contain multiple unbracketed JSON objects
 * (e.g. newline-delimited JSON or concatenated JSON objects from the streaming endpoint).
 */
export function parseInstagramResponseStream(rawText: string): Record<string, unknown>[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Try direct JSON parse first (in case it's a single object or standard JSON array)
  try {
    const direct = JSON.parse(trimmed);
    if (Array.isArray(direct)) {
      return direct.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
    if (typeof direct === "object" && direct !== null) {
      return [direct as Record<string, unknown>];
    }
  } catch {
    // Continue to multi-object stream parser
  }

  // 1. Try splitting by newlines (NDJSON format as in res.txt)
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lineObjects: Record<string, unknown>[] = [];
  let allLinesParsed = true;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === "object") {
        lineObjects.push(obj as Record<string, unknown>);
      }
    } catch {
      allLinesParsed = false;
      break;
    }
  }

  if (allLinesParsed && lineObjects.length > 0) {
    return lineObjects;
  }

  // 2. Scan bracket boundaries for concatenated JSON objects (e.g. `}{` without newlines)
  try {
    const extractedObjects: Record<string, unknown>[] = [];
    let depth = 0;
    let inString = false;
    let escape = false;
    let startIndex = -1;

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") {
          if (depth === 0) startIndex = i;
          depth++;
        } else if (char === "}") {
          depth--;
          if (depth === 0 && startIndex !== -1) {
            const jsonChunk = trimmed.slice(startIndex, i + 1);
            try {
              const obj = JSON.parse(jsonChunk);
              if (obj && typeof obj === "object") {
                extractedObjects.push(obj as Record<string, unknown>);
              }
            } catch {
              // ignore bad chunk
            }
            startIndex = -1;
          }
        }
      }
    }

    if (extractedObjects.length > 0) {
      return extractedObjects;
    }
  } catch {
    // fallback
  }

  return [];
}

/**
 * Checks an individual Instagram username against the Instagram API.
 * Uses AbortController for timeout and strictly server-side environment credentials.
 */
export async function checkInstagramUsername(username: string): Promise<CheckResult> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return {
      username,
      status: "error",
      error: "Username is empty",
    };
  }

  const encodedUsername = encodeURIComponent(cleanUsername);
  const targetUrl = `https://i.instagram.com/api/v1/users/${encodedUsername}/usernameinfo_stream/`;

  const authToken = process.env.INSTAGRAM_AUTH_TOKEN?.trim();
  const headers: Record<string, string> = {
    "User-Agent":
      "Instagram 315.0.0.38.109 Android (34/14; 480dpi; 1080x2400; samsung; SM-G998B; p3s; exynos2100; en_US; 564284897)",
    "X-IG-App-ID": "1217981644879628",
    "X-IG-Capabilities": "3679n1w=",
    "X-IG-Connection-Type": "WIFI",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  if (authToken) {
    const bearerValue = authToken.toLowerCase().startsWith("bearer ")
      ? authToken
      : `Bearer ${authToken}`;
    headers["Authorization"] = bearerValue;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    const statusCode = response.status;
    const rawText = await response.text();

    // Parse stream response which may contain multiple objects
    const parsedObjects = parseInstagramResponseStream(rawText);

    // HTTP 200: Check for active user or fail messages
    if (statusCode === 200) {
      let activeUserProfile: UserProfileInfo | undefined;

      for (const obj of parsedObjects) {
        if (!obj || typeof obj !== "object") continue;
        const user = obj.user as Record<string, unknown> | undefined;
        if (
          user &&
          typeof user === "object" &&
          (user.pk !== undefined ||
            user.id !== undefined ||
            typeof user.username === "string")
        ) {
          activeUserProfile = {
            fullName: typeof user.full_name === "string" ? user.full_name : "",
            mediaCount: typeof user.media_count === "number" ? user.media_count : 0,
            followerCount: typeof user.follower_count === "number" ? user.follower_count : 0,
            followingCount: typeof user.following_count === "number" ? user.following_count : 0,
            isVerified: Boolean(user.is_verified),
            isPrivate: Boolean(user.is_private),
            profilePicUrl: typeof user.profile_pic_url === "string" ? user.profile_pic_url : undefined,
            biography: typeof user.biography === "string" ? user.biography : "",
          };
          break;
        }
      }

      if (activeUserProfile) {
        return {
          username: cleanUsername,
          status: "active",
          statusCode: 200,
          profile: activeUserProfile,
        };
      }

      // Check if response contains a fail status
      const hasFail = parsedObjects.some(
        (obj) => obj.status === "fail" || obj.status_code === "404"
      );
      if (hasFail) {
        return {
          username: cleanUsername,
          status: "suspended",
          statusCode: 200,
        };
      }

      return {
        username: cleanUsername,
        status: "error",
        statusCode: 200,
        error: "Unexpected response format from Instagram",
      };
    }

    // HTTP 404: Suspended / Not found
    if (statusCode === 404) {
      return {
        username: cleanUsername,
        status: "suspended",
        statusCode: 404,
      };
    }

    // HTTP 429: Rate limited
    if (statusCode === 429) {
      return {
        username: cleanUsername,
        status: "error",
        statusCode: 429,
        error: "Instagram rate limit reached (HTTP 429)",
      };
    }

    // HTTP 401 / 403: Authorization issue
    if (statusCode === 401 || statusCode === 403) {
      return {
        username: cleanUsername,
        status: "error",
        statusCode,
        error: `Authentication required or invalid auth token (HTTP ${statusCode})`,
      };
    }

    // 5xx: Server errors
    if (statusCode >= 500 && statusCode < 600) {
      return {
        username: cleanUsername,
        status: "error",
        statusCode,
        error: `Instagram server error (HTTP ${statusCode})`,
      };
    }

    // Any other unexpected status code
    return {
      username: cleanUsername,
      status: "error",
      statusCode,
      error: `Unexpected HTTP status ${statusCode}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return {
          username: cleanUsername,
          status: "error",
          error: "Request timed out (10s)",
        };
      }
      return {
        username: cleanUsername,
        status: "error",
        error: err.message || "Network request failed",
      };
    }

    return {
      username: cleanUsername,
      status: "error",
      error: "Unknown request failure",
    };
  }
}
