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
 * Uses AbortController for timeout and strictly server-side environment credentials.
 */
export async function checkInstagramUsername(
  username: string,
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
  const targetUrl = `https://i.instagram.com/api/v1/users/${encodedUsername}/usernameinfo_stream/`;

  const authToken = process.env.INSTAGRAM_AUTH_TOKEN?.trim();
  const headers: Record<string, string> = {
    // ── Core identity ──────────────────────────────────────────────────────
    host: "i.instagram.com",
    "user-agent":
      "Instagram 439.0.0.37.89 Android (35/15; 320dpi; 720x1280; Samsung; SM-A235F; a23; Samsung; en_US; 1021815514)",
    "accept-language": "en-US",
    "accept-encoding": "zstd",

    // ── IG user / session ──────────────────────────────────────────────────
    "ig-intended-user-id": "30363686894",
    "ig-u-ds-user-id": "30363686894",
    "ig-u-rur":
      "KND,30363686894,1822147041:01fff548a3c1decbaea972d7db19b4a0cc53723246adc9bcdffb8128acf4b067587da9c7",

    // ── IG app metadata ────────────────────────────────────────────────────
    "x-ig-app-id": "567067343352427",
    "x-ig-app-locale": "en_US",
    "x-ig-device-locale": "en_US",
    "x-ig-mapped-locale": "en_US",
    "x-ig-capabilities": "3brTv10=",
    "x-ig-connection-type": "WIFI",
    "x-ig-android-id": "android-9691f855d31a4b7c",
    "x-ig-device-id": "2972ce01-b663-419b-8277-dcb374c6e455",
    "x-ig-family-device-id": "7a25c62f-4550-4d81-bd78-996bdfb095d2",
    "x-ig-device-languages": '{"system_languages":"en-US"}',
    "x-ig-is-foldable": "false",
    "x-ig-timezone-offset": "19800",
    "x-ig-bandwidth-speed-kbps": "2406.000",
    "x-ig-bandwidth-totalbytes-b": "0",
    "x-ig-bandwidth-totaltime-ms": "0",
    "x-ig-client-endpoint": "MainFeedFragment:feed_timeline",
    "x-ig-nav-chain":
      "MainFeedFragment:feed_timeline:1:cold_start:1790611038.831:::1790611038.831",
    "x-ig-www-claim": "hmac.AR0rMikf7sKOVCcQ702jDozUDyPkXGQ2oXKdmYd4HesUb0kd",

    // ── Bloks / Prism UI flags ─────────────────────────────────────────────
    "x-bloks-is-layout-rtl": "false",
    "x-bloks-version-id":
      "3ae1e6445cdefeda05bde09f57499d84157ad74699044bf7fe9ca9183150f17a",
    "x-bloks-prism-button-version": "INDIGO_PRIMARY_BORDERED_SECONDARY",
    "x-bloks-prism-colors-enabled": "true",
    "x-bloks-prism-extended-palette-gray": "true",
    "x-bloks-prism-extended-palette-indigo": "true",
    "x-bloks-prism-extended-palette-polish-enabled": "true",
    "x-bloks-prism-extended-palette-red": "true",
    "x-bloks-prism-extended-palette-rest-of-colors": "true",
    "x-bloks-prism-font-enabled": "true",
    "x-bloks-prism-indigo-link-version": "1",

    // ── FB / Meta transport ────────────────────────────────────────────────
    "x-fb-client-ip": "True",
    "x-fb-server-cluster": "True",
    "x-fb-connection-type": "WIFI",
    "x-fb-network-properties": "Wifi;VPN;Metered;Validated;",
    "x-fb-appnetsession-nid": "d5614e4244632b4e481ef6ad90afe9ea,Wifi",
    "x-fb-appnetsession-sid": "3a6a172baf5f3f1ff8df173bddcebcc8",
    "x-fb-conn-uuid-client": "42cdffde60dfc0141d92be1292da67dc",
    "x-fb-http-engine": "Tigon/MNS/TCP",
    "x-fb-session-id": "nid=eXqFAq9shyVY;nc=1;fc=1;bc=0;",
    "x-fb-session-private": "8VtyNNGL2uny",

    // ── Misc ───────────────────────────────────────────────────────────────
    priority: "u=3",
    "x-mid": "argLxAABAAF_5dn4WLrlgFYhQoCE",
    "x-meta-usdid":
      "8f4223ab-44a9-4503-ac34-867b5097315b.1790614641.MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEzWw-h5aXAKW5Y_zfGfQ0fIdSman0o3BwLQF6ebXBrkCHPI7OxCdW2CGJQonNZ1w-G1NTXSezd4ykOh-TupmfLA.MEYCIQDLzpJFDenf0AnGJl3rEZwyfZVgYypAlEvWZFKMi64WugIhAJA_fZvsuhFwiVvCA_3B6MvnbNZtM9xX1-QgJ3uIJiG7",
    "x-pigeon-rawclienttime": "1790611040.782",
    "x-pigeon-session-id": "UFS-a2d1e728-073e-4bdb-af89-887a5feb115d-0",
    "x-tigon-is-retry": "False",
    "x-meta-tasos-congestion-config": "v6_1",
    "x-meta-zca":
      "eyJhbmRyb2lkIjp7ImFrYSI6eyJkYXRhVG9TaWduIjoie1widGltZVwiOlwiMTc5MDYxMTAzNzI2MVwiLFwiaGFzaFwiOlwiNlpnOF9USGVqRmdFT3NBRDlmUHdzQy1hY3pCZG91SHZ1SGtQTlJmMXhSNFwifSIsInNpZ25lZERhdGEiOiJNRVlDSVFEMmY2UEpTdzluU0ViRkJpdGdvVlIxOXlvUGhxbXRUUmxMMm11U21DME5HUUloQUtlVGQ2VkZDMVNfUTdVanFRRi0xNzl0TXRPTVN5aWRNUmtPWG9QNkR5RzUiLCJrZXlIYXNoIjoiOWZlYTczNGNkMDM2N2NhODA5NDg3Yzg4MzViMTA0ODNmYjFkZDlmY2ZlODMxNDUzZWUyNDAzMDhmYzEwMTRiMyIsImxhc3RVcGxvYWRlZEtleVRpbWVNcyI6MTc5MDQ0NjY0MTg3MH0sImdwaWEiOnsidG9rZW4iOiIiLCJlcnJvcnMiOlsiU0hBUkVEX0lNUExfR0VUX1RPS0VOX1JFVFJZX05PVF9BTExPV0VEIiwiUExBWV9JTlRFR1JJVFlfVE9LRU5fUkVUUklFVkFMX0VSUk9SIl19LCJwYXlsb2FkIjp7InBsdWdpbnMiOnsiYmF0Ijp7InN0YSI6IlVucGx1Z2dlZCIsImx2bCI6OTl9LCJzY3QiOnt9LCJhZGIiOnsidXNiIjotMSwiYWRiIjowLCJ1c2JfYWRiIjotMX19fX19",
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
            mediaCount:
              typeof user.media_count === "number" ? user.media_count : 0,
            followerCount:
              typeof user.follower_count === "number" ? user.follower_count : 0,
            followingCount:
              typeof user.following_count === "number"
                ? user.following_count
                : 0,
            isVerified: Boolean(user.is_verified),
            isPrivate: Boolean(user.is_private),
            profilePicUrl:
              typeof user.profile_pic_url === "string"
                ? user.profile_pic_url
                : undefined,
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
