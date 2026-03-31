// app/api/mcp/route.ts
// MCP (Model Context Protocol) server endpoint for JKKN AI Forms
// Enables Claude to create forms, manage events, view responses conversationally

import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/mcp/auth';
import { registerTools } from '@/lib/mcp/tools';

// ─── In-memory rate limiter ────────────────────────────────────────
// Tracks request counts per IP address using a sliding window.
// Resets automatically when the window expires. Suitable for single-
// instance deployments (Vercel serverless functions share no memory
// across invocations, so this is best-effort — the primary defense
// is Supabase auth + RLS, not this limiter).
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // max requests per window
const RATE_WINDOW = 60_000; // 1-minute sliding window

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    // First request in this window, or window expired — start fresh
    const resetAt = now + RATE_WINDOW;
    rateLimits.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt };
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  return { allowed: entry.count <= RATE_LIMIT, remaining, resetAt: entry.resetAt };
}

// Periodically prune stale entries to prevent unbounded memory growth.
// Runs at most once every 5 minutes.
let lastPrune = Date.now();
function pruneStaleEntries() {
  const now = Date.now();
  if (now - lastPrune < 5 * 60_000) return;
  lastPrune = now;
  for (const [ip, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(ip);
  }
}

// ─── MCP handler setup ────────────────────────────────────────────
const baseHandler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: 'JKKN AI Forms',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api',
    streamableHttpEndpoint: '/mcp',
    maxDuration: 60,
  }
);

const mcpHandler = withMcpAuth(baseHandler, verifyToken, {
  required: false, // Allow unauthenticated tool listing (discovery)
});

// ─── Rate-limited wrapper ─────────────────────────────────────────
// Checks the client IP against the rate limiter before forwarding
// to the MCP handler. Returns 429 Too Many Requests if exceeded.
async function rateLimitedHandler(req: Request) {
  pruneStaleEntries();

  // Extract client IP — Vercel sets x-forwarded-for; fall back to
  // x-real-ip, then a generic key for local development.
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  const { allowed, remaining, resetAt } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit of ${RATE_LIMIT} requests per minute exceeded. Try again shortly.`,
        retryAfterMs: Math.max(0, resetAt - Date.now()),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(Math.max(0, resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  // Forward to the MCP handler — attach rate limit headers to the
  // response so clients can self-throttle.
  const response = await mcpHandler(req);

  // mcpHandler may return a Response or undefined/null for streaming.
  // Only attach headers if we get a proper Response object.
  if (response instanceof Response) {
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  }

  return response;
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST, rateLimitedHandler as DELETE };
