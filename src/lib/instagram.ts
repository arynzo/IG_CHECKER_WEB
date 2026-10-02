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
const TOKEN_ENDPOINT = "https://auto.arynzo.xyz/api/igt/token";

/**
 * Fetches the latest Instagram Authorization Bearer token from the remote token service.
 * Falls back to process.env.INSTAGRAM_AUTH_TOKEN if the service fails or returns invalid data.
 */
export async function fetchInstagramAuthToken(): Promise<string | undefined> {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        token?: string;
      };

      if (
        data &&
        data.success &&
        typeof data.token === "string" &&
        data.token.trim().length > 0
      ) {
        return data.token.trim();
      }
    }
  } catch (err) {
    console.error("Failed to fetch dynamic Instagram auth token from endpoint:", err);
  }

  // Fallback to local environment variable if available
  return process.env.INSTAGRAM_AUTH_TOKEN?.trim();
}

/**
 * Helper to extract numeric counts safely from object with fallbacks
 */
function extractCount(user: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const val = user[key];
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val))) {
      return Number(val);
    }
    if (val && typeof val === "object" && "count" in val) {
      const countVal = (val as { count: unknown }).count;
      if (typeof countVal === "number" && !isNaN(countVal)) return countVal;
      if (
        typeof countVal === "string" &&
        countVal.trim() !== "" &&
        !isNaN(Number(countVal))
      ) {
        return Number(countVal);
      }
    }
  }
  return 0;
}

/**
 * Safely parses Instagram response stream which may contain multiple unbracketed JSON objects
 * (e.g. newline-delimited JSON or concatenated JSON objects from the streaming endpoint).
 */
export function parseInstagramResponseStream(
  rawText: string,
): Record<string, unknown>[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Try direct JSON parse first (in case it's a single object or standard JSON array)
  try {
    const direct = JSON.parse(trimmed);
    if (Array.isArray(direct)) {
      return direct.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      );
    }
    if (typeof direct === "object" && direct !== null) {
      return [direct as Record<string, unknown>];
    }
  } catch {
    // Continue to multi-object stream parser
  }

  // 1. Try splitting by newlines (NDJSON format as in res.txt)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
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
 * Uses dynamic auth token from remote token service or passed in batch token.
 */
export async function checkInstagramUsername(
  username: string,
  overrideAuthToken?: string,
): Promise<CheckResult> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return {
      username,
      status: "error",
      error: "Username is empty",
    };
  }

  const encodedUsername = encodeURIComponent(cleanUsername);
  // i.instagram.com → 200 ✅  (static.cdninstagram.com → 404 from server/datacenter IPs)
  const targetUrl = `https://i.instagram.com/api/v1/users/${encodedUsername}/usernameinfo_stream/`;

  let authToken = overrideAuthToken?.trim();
  if (!authToken) {
    authToken = (await fetchInstagramAuthToken()) || process.env.INSTAGRAM_AUTH_TOKEN?.trim();
  }

  const headers: Record<string, string> = {
    Host: "i.instagram.com",
    "Accept-Encoding": "gzip, deflate, br",
    "user-agent":
      "Instagram 439.0.0.37.89 Android (35/15; 320dpi; 720x1280; Samsung; SM-A235F; a23; Samsung; en_US; 1021815514)",
    "x-ig-app-id": "567067343352427",
  };

  if (authToken) {
    const bearerValue = authToken.toLowerCase().startsWith("bearer ")
      ? authToken
      : `Bearer ${authToken}`;
    headers["authorization"] = bearerValue;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
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
      let mergedUserData: Record<string, unknown> = {};
      let hasUserObject = false;

      for (const obj of parsedObjects) {
        if (!obj || typeof obj !== "object") continue;
        const user = (obj.user ||
          (obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>).user : undefined) ||
          obj) as Record<string, unknown> | undefined;

        if (
          user &&
          typeof user === "object" &&
          (user.pk !== undefined ||
            user.id !== undefined ||
            typeof user.username === "string" ||
            user.follower_count !== undefined)
        ) {
          hasUserObject = true;
          mergedUserData = { ...mergedUserData, ...user };
        }
      }

      if (hasUserObject) {
        // Extract HD profile picture if available, otherwise regular profile pic
        let profilePicUrl: string | undefined;
        if (
          mergedUserData.hd_profile_pic_url_info &&
          typeof mergedUserData.hd_profile_pic_url_info === "object" &&
          "url" in (mergedUserData.hd_profile_pic_url_info as Record<string, unknown>)
        ) {
          profilePicUrl = String((mergedUserData.hd_profile_pic_url_info as Record<string, unknown>).url);
        } else if (
          Array.isArray(mergedUserData.hd_profile_pic_versions) &&
          mergedUserData.hd_profile_pic_versions.length > 0
        ) {
          const firstVer = mergedUserData.hd_profile_pic_versions[0];
          if (firstVer && typeof firstVer === "object" && "url" in firstVer) {
            profilePicUrl = String((firstVer as Record<string, unknown>).url);
          }
        }
        if (!profilePicUrl && typeof mergedUserData.profile_pic_url === "string") {
          profilePicUrl = mergedUserData.profile_pic_url;
        }

        // Extract biography
        let biography = "";
        if (typeof mergedUserData.biography === "string") {
          biography = mergedUserData.biography;
        } else if (
          mergedUserData.biography_with_entities &&
          typeof mergedUserData.biography_with_entities === "object" &&
          "raw_text" in (mergedUserData.biography_with_entities as Record<string, unknown>)
        ) {
          biography = String((mergedUserData.biography_with_entities as Record<string, unknown>).raw_text);
        }

        const activeUserProfile: UserProfileInfo = {
          fullName:
            typeof mergedUserData.full_name === "string"
              ? mergedUserData.full_name
              : typeof mergedUserData.fullName === "string"
                ? mergedUserData.fullName
                : "",
          mediaCount: extractCount(
            mergedUserData,
            "media_count",
            "posts_count",
            "post_count",
            "mediaCount",
            "posts",
            "edge_owner_to_timeline_media",
          ),
          followerCount: extractCount(
            mergedUserData,
            "follower_count",
            "followers_count",
            "followerCount",
            "followers",
            "edge_followed_by",
          ),
          followingCount: extractCount(
            mergedUserData,
            "following_count",
            "followings_count",
            "followingCount",
            "following",
            "edge_follow",
          ),
          isVerified: Boolean(
            mergedUserData.is_verified ?? mergedUserData.isVerified,
          ),
          isPrivate: Boolean(
            mergedUserData.is_private ?? mergedUserData.isPrivate,
          ),
          profilePicUrl,
          biography,
        };

        return {
          username: cleanUsername,
          status: "active",
          statusCode: 200,
          profile: activeUserProfile,
        };
      }

      // Check if response contains a fail status
      const hasFail = parsedObjects.some(
        (obj) => obj.status === "fail" || obj.status_code === "404",
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
