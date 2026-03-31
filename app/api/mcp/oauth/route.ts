// OAuth 2.0 endpoints for MCP authentication
// Handles: authorize, token exchange, refresh, and Google OAuth redirect
//
// Flow for Claude.ai custom connector (Google OAuth — primary):
// 1. Claude.ai redirects to GET /api/mcp/oauth?action=authorize&state=...&redirect_uri=...
// 2. User sees a login page with "Sign in with Google" button
// 3. Button redirects to Supabase Google OAuth with our callback URL
// 4. After Google login, Supabase redirects to /api/mcp/oauth/callback (handled below)
// 5. Callback extracts tokens and redirects back to Claude.ai's redirect_uri
//
// Flow for Claude Code / B2A (email+password — fallback):
// POST /api/mcp/oauth with action=token and email/password for direct token exchange

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function exchangeCredentials(
  email: string,
  password: string
): Promise<
  | { access_token: string; refresh_token: string; expires_in: number }
  | { error: string }
> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return { error: error?.message || 'Authentication failed' };
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  };
}

async function refreshAccessToken(
  refreshToken: string
): Promise<
  | { access_token: string; refresh_token: string; expires_in: number }
  | { error: string }
> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return { error: error?.message || 'Token refresh failed' };
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  };
}

// ---------------------------------------------------------------------------
// OPTIONS — CORS pre-flight
// ---------------------------------------------------------------------------

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ---------------------------------------------------------------------------
// GET /api/mcp/oauth — Authorization endpoint
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // ── Handle Google OAuth callback (after Supabase redirects back) ──────
  if (action === 'callback') {
    const accessToken = searchParams.get('access_token') || '';
    const refreshToken = searchParams.get('refresh_token') || '';
    const expiresIn = searchParams.get('expires_in') || '3600';
    const state = searchParams.get('state') || '';
    const redirectUri = searchParams.get('redirect_uri') || '';
    const errorParam = searchParams.get('error') || '';
    const errorDescription = searchParams.get('error_description') || '';

    // If there was an error from Supabase/Google
    if (errorParam) {
      const html = buildLoginPage(state, redirectUri, errorDescription || errorParam);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
      });
    }

    // If we have tokens and a redirect_uri, redirect back to Claude.ai
    if (accessToken && redirectUri) {
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('access_token', accessToken);
      callbackUrl.searchParams.set('token_type', 'bearer');
      callbackUrl.searchParams.set('expires_in', expiresIn);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }
      return Response.redirect(callbackUrl.toString(), 302);
    }

    // If we have tokens from hash fragment (Supabase implicit flow), show
    // a page that reads the hash and redirects
    if (redirectUri) {
      const html = buildHashExtractorPage(state, redirectUri);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
      });
    }

    // No redirect_uri — show success with token info
    if (accessToken) {
      return NextResponse.json(
        {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
          expires_in: Number(expiresIn),
        },
        { headers: corsHeaders() }
      );
    }

    // Fallback: show login page
    const html = buildLoginPage('', '', 'Authentication failed. Please try again.');
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
    });
  }

  // ── Show login page ───────────────────────────────────────────────────
  if (action === 'authorize' || action === 'login' || !action) {
    const state = searchParams.get('state') || '';
    const redirectUri = searchParams.get('redirect_uri') || '';

    const html = buildLoginPage(state, redirectUri);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
    });
  }

  return NextResponse.json(
    { error: 'Invalid action. Use action=authorize to start the OAuth flow.' },
    { status: 400, headers: corsHeaders() }
  );
}

// ---------------------------------------------------------------------------
// POST /api/mcp/oauth — Token exchange endpoint
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, string>;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const entries: Record<string, string> = {};
      formData.forEach((value, key) => {
        entries[key] = String(value);
      });
      body = entries;
    } else {
      body = await request.json();
    }

    const {
      action,
      email,
      password,
      refresh_token: bodyRefreshToken,
      state,
      redirect_uri,
    } = body;

    // ── Google OAuth: redirect to Supabase Google provider ──────────────
    if (action === 'google') {
      const baseUrl = getBaseUrl();
      // Build the callback URL that Supabase will redirect to after Google login
      // We encode state and redirect_uri so they survive the OAuth round-trip
      const callbackParams = new URLSearchParams();
      callbackParams.set('action', 'callback');
      if (state) callbackParams.set('state', state);
      if (redirect_uri) callbackParams.set('redirect_uri', redirect_uri);

      const supabaseCallbackUrl = `${baseUrl}/api/mcp/oauth?${callbackParams.toString()}`;

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: supabaseCallbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error || !data.url) {
        const html = buildLoginPage(
          state || '',
          redirect_uri || '',
          error?.message || 'Failed to initiate Google sign-in'
        );
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
        });
      }

      // Redirect to Google's OAuth consent screen via Supabase
      return Response.redirect(data.url, 302);
    }

    // ── Email/password token exchange ───────────────────────────────────
    if (action === 'token' || action === 'login') {
      if (!email || !password) {
        if (redirect_uri) {
          const html = buildLoginPage(
            state || '',
            redirect_uri,
            'Email and password are required.'
          );
          return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
          });
        }
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const result = await exchangeCredentials(email, password);

      if ('error' in result) {
        if (redirect_uri) {
          const html = buildLoginPage(state || '', redirect_uri, result.error);
          return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() },
          });
        }
        return NextResponse.json(
          { error: result.error },
          { status: 401, headers: corsHeaders() }
        );
      }

      // If redirect_uri is set, redirect back to Claude.ai with the token
      if (redirect_uri) {
        const callbackUrl = new URL(redirect_uri);
        callbackUrl.searchParams.set('access_token', result.access_token);
        callbackUrl.searchParams.set('token_type', 'bearer');
        callbackUrl.searchParams.set('expires_in', String(result.expires_in));
        if (state) {
          callbackUrl.searchParams.set('state', state);
        }

        return Response.redirect(callbackUrl.toString(), 302);
      }

      // Direct token exchange (for Claude Code / API clients)
      return NextResponse.json(
        {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: 'bearer',
          expires_in: result.expires_in,
        },
        { headers: corsHeaders() }
      );
    }

    // ── Token refresh ───────────────────────────────────────────────────
    if (action === 'refresh') {
      if (!bodyRefreshToken) {
        return NextResponse.json(
          { error: 'refresh_token is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const result = await refreshAccessToken(bodyRefreshToken);

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 401, headers: corsHeaders() }
        );
      }

      return NextResponse.json(
        {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: 'bearer',
          expires_in: result.expires_in,
        },
        { headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "token", "google", or "refresh".' },
      { status: 400, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('[MCP OAuth] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ---------------------------------------------------------------------------
// HTML Builders
// ---------------------------------------------------------------------------

/**
 * Builds the login page with Google OAuth button and email/password fallback.
 * This is what Claude.ai users see when they connect the MCP server.
 */
function buildLoginPage(
  state: string,
  redirectUri: string,
  errorMessage?: string
): string {
  const baseUrl = getBaseUrl();
  const actionUrl = `${baseUrl}/api/mcp/oauth`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in - JKKN AI Forms</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #f0f0ff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1);
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
    }
    .brand {
      text-align: center;
      margin-bottom: 0.5rem;
    }
    .brand h1 {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(135deg, #3b82f6, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
      margin-bottom: 1.75rem;
    }
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .google-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem;
      background: white;
      color: #374151;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .google-btn:hover {
      border-color: #3b82f6;
      background: #f8fafc;
      box-shadow: 0 1px 3px rgba(59,130,246,.15);
    }
    .google-icon {
      width: 20px;
      height: 20px;
    }
    .divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
      color: #94a3b8;
      font-size: 0.75rem;
    }
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .divider span { padding: 0 0.75rem; }
    label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.25rem;
    }
    input[type="email"],
    input[type="password"] {
      display: block;
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 0.875rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,.12);
    }
    .submit-btn {
      display: block;
      width: 100%;
      padding: 0.6875rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
      margin-top: 0.25rem;
    }
    .submit-btn:hover { background: #2563eb; }
    .footer {
      text-align: center;
      margin-top: 1.25rem;
      font-size: 0.6875rem;
      color: #94a3b8;
    }
    .lock-icon {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.75rem;
      font-size: 0.6875rem;
      color: #94a3b8;
      justify-content: center;
      width: 100%;
    }
    .lock-icon svg { width: 12px; height: 12px; }
    @media (max-width: 480px) {
      .card { padding: 2rem 1.25rem; }
      .brand h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <h1>JKKN AI Forms</h1>
    </div>
    <p class="subtitle">Sign in to connect Claude to JKKN AI Forms</p>

    ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ''}

    <!-- Google OAuth (primary) -->
    <form method="POST" action="${escapeHtml(actionUrl)}">
      <input type="hidden" name="action" value="google">
      <input type="hidden" name="state" value="${escapeHtml(state)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
      <button type="submit" class="google-btn">
        <svg class="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </form>

    <div class="divider"><span>or use credentials</span></div>

    <!-- Email/password fallback -->
    <form method="POST" action="${escapeHtml(actionUrl)}">
      <input type="hidden" name="action" value="login">
      <input type="hidden" name="state" value="${escapeHtml(state)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required placeholder="you@jkkn.ac.in">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required placeholder="Your password">
      <button type="submit" class="submit-btn">Sign in</button>
    </form>

    <div class="lock-icon">
      <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
      Secured with OAuth 2.0
    </div>
    <div class="footer">JKKN AI Forms &mdash; Intelligent Event &amp; Form Management</div>
  </div>
</body>
</html>`;
}

/**
 * Builds a page that extracts tokens from the URL hash fragment.
 * Supabase's implicit grant flow puts tokens in the hash, not query params.
 * This page reads them client-side and redirects back to Claude.ai.
 */
function buildHashExtractorPage(state: string, redirectUri: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Completing sign-in... - JKKN AI Forms</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,.1);
      padding: 2.5rem 2rem;
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 1.125rem; color: #1e293b; margin-bottom: 0.5rem; }
    p { color: #64748b; font-size: 0.875rem; }
    .error-msg {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.75rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-size: 0.875rem;
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Completing sign-in</h2>
    <p>Redirecting you back to Claude...</p>
    <div id="error" class="error-msg"></div>
  </div>
  <script>
    (function() {
      try {
        var hash = window.location.hash.substring(1);
        var params = new URLSearchParams(hash);
        var accessToken = params.get('access_token');
        var expiresIn = params.get('expires_in') || '3600';
        var state = ${JSON.stringify(state)};
        var redirectUri = ${JSON.stringify(redirectUri)};

        // Also check query params (some Supabase flows use query instead of hash)
        if (!accessToken) {
          var qp = new URLSearchParams(window.location.search);
          accessToken = qp.get('access_token');
          expiresIn = qp.get('expires_in') || expiresIn;
        }

        if (accessToken && redirectUri) {
          var url = new URL(redirectUri);
          url.searchParams.set('access_token', accessToken);
          url.searchParams.set('token_type', 'bearer');
          url.searchParams.set('expires_in', expiresIn);
          if (state) url.searchParams.set('state', state);
          window.location.href = url.toString();
        } else {
          var errEl = document.getElementById('error');
          errEl.textContent = 'Authentication failed. No access token received. Please try again.';
          errEl.style.display = 'block';
          document.querySelector('.spinner').style.display = 'none';
          document.querySelector('h2').textContent = 'Sign-in failed';
          document.querySelector('p').textContent = '';
        }
      } catch (e) {
        var errEl = document.getElementById('error');
        errEl.textContent = 'An unexpected error occurred: ' + e.message;
        errEl.style.display = 'block';
      }
    })();
  </script>
</body>
</html>`;
}
