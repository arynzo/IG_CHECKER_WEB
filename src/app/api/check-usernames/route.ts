import { NextRequest, NextResponse } from "next/server";
import {
  checkInstagramUsername,
  fetchInstagramAuthToken,
  type CheckResult,
} from "@/lib/instagram";

export const dynamic = "force-dynamic";

const MAX_USERNAMES = 500;
const CONCURRENCY_LIMIT = 5;

/**
 * Worker pool helper for executing tasks with controlled concurrency.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onResult?: (result: R) => void | Promise<void>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const runWorker = async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      const res = await worker(item, idx);
      results[idx] = res;
      if (onResult) {
        await onResult(res);
      }
    }
  };

  const pool = Array.from({ length: Math.min(limit, items.length) }, () =>
    runWorker()
  );

  await Promise.all(pool);
  return results;
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || !("usernames" in body)) {
      return NextResponse.json(
        { error: "Missing required 'usernames' array in request body" },
        { status: 400 }
      );
    }

    const rawUsernames = (body as { usernames: unknown; stream?: boolean }).usernames;
    const isStreamRequested = (body as { stream?: boolean }).stream ?? true;

    if (!Array.isArray(rawUsernames)) {
      return NextResponse.json(
        { error: "'usernames' must be an array of strings" },
        { status: 400 }
      );
    }

    // Sanitize and validate usernames
    const seen = new Set<string>();
    const cleanedUsernames: string[] = [];

    for (const item of rawUsernames) {
      if (typeof item === "string") {
        const clean = item.trim().replace(/^@+/, "");
        if (clean.length > 0 && !seen.has(clean.toLowerCase())) {
          seen.add(clean.toLowerCase());
          cleanedUsernames.push(clean);
        }
      }
    }

    if (cleanedUsernames.length === 0) {
      return NextResponse.json(
        { error: "No valid usernames provided" },
        { status: 400 }
      );
    }

    if (cleanedUsernames.length > MAX_USERNAMES) {
      return NextResponse.json(
        { error: `Too many usernames. Maximum allowed is ${MAX_USERNAMES} per request.` },
        { status: 400 }
      );
    }

    // Fetch fresh dynamic token from endpoint before starting checks
    const authToken = await fetchInstagramAuthToken();

    // Progressive streaming response
    if (isStreamRequested) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            await runWithConcurrency(
              cleanedUsernames,
              CONCURRENCY_LIMIT,
              async (uname) => {
                return await checkInstagramUsername(uname, authToken);
              },
              async (result: CheckResult) => {
                const chunk = JSON.stringify(result) + "\n";
                controller.enqueue(encoder.encode(chunk));
              }
            );
          } catch (err) {
            const errResult: CheckResult = {
              username: "system",
              status: "error",
              error: err instanceof Error ? err.message : "Processing stream error",
            };
            controller.enqueue(encoder.encode(JSON.stringify(errResult) + "\n"));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Non-streaming fallback response
    const results = await runWithConcurrency(
      cleanedUsernames,
      CONCURRENCY_LIMIT,
      async (uname) => {
        return await checkInstagramUsername(uname, authToken);
      }
    );

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
