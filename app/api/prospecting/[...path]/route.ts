const DEFAULT_PROSPECTING_API_BASE_URL = "https://angelos-prospecting-production.up.railway.app";
const PROSPECTING_API_BASE_URL = (process.env.PROSPECTING_API_URL || DEFAULT_PROSPECTING_API_BASE_URL).replace(/\/$/, "");
const PROSPECTING_DASHBOARD_SECRET = process.env.PROSPECTING_DASHBOARD_SECRET || process.env.DASHBOARD_SECRET || "";
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const FORWARDED_REQUEST_HEADERS = new Set(["content-type", "authorization"]);

type RouteContext = { params: Promise<{ path: string[] }> };

function buildTargetUrl(path: string[], search: string, userId: string) {
  if (!PROSPECTING_API_BASE_URL) {
    throw new Error("PROSPECTING_API_URL is not configured");
  }

  const normalizedPath = path.map(encodeURIComponent).join("/");
  const target = new URL(`${PROSPECTING_API_BASE_URL}/prospecting/${normalizedPath}`);
  const incoming = new URLSearchParams(search);
  incoming.forEach((value, key) => {
    if (key !== "user_id") target.searchParams.append(key, value);
  });
  target.searchParams.set("user_id", userId);
  return target.toString();
}

async function verifiedUserId(request: Request): Promise<string | Response> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return Response.json({ detail: "Supabase auth is not configured" }, { status: 500 });
  }

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return Response.json({
      detail: "Session manquante. Reconnecte-toi puis réessaie.",
      message: "Session manquante. Reconnecte-toi puis réessaie.",
      error_type: "missing_session",
    }, { status: 401 });
  }

  const authCheck = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization,
    },
    cache: "no-store",
  });

  if (!authCheck.ok) {
    return Response.json({
      detail: "Session expirée ou invalide. Reconnecte-toi puis réessaie.",
      message: "Session expirée ou invalide. Reconnecte-toi puis réessaie.",
      error_type: "invalid_session",
    }, { status: 401 });
  }

  const user = await authCheck.json();
  if (!user?.id || typeof user.id !== "string") {
    return Response.json({ detail: "Session Supabase invalide: user_id manquant." }, { status: 401 });
  }

  return user.id;
}

async function requestBodyWithUserId(request: Request, userId: string): Promise<BodyInit | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;

  const contentType = request.headers.get("content-type") || "";
  const rawBody = await request.text();
  if (!rawBody) return undefined;

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return JSON.stringify({ ...parsed, user_id: userId });
      }
    } catch {
      // Keep raw payload below; backend will return a validation error if invalid.
    }
  }

  return rawBody;
}

async function forwardRequest(request: Request, context: RouteContext) {
  const userId = await verifiedUserId(request);
  if (userId instanceof Response) return userId;

  if (!PROSPECTING_DASHBOARD_SECRET) {
    return Response.json({ detail: "PROSPECTING_DASHBOARD_SECRET is not configured" }, { status: 500 });
  }

  const { path } = await context.params;
  const url = new URL(request.url);
  const targetUrl = buildTargetUrl(path || [], url.search, userId);

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  headers.set("x-dashboard-secret", PROSPECTING_DASHBOARD_SECRET);
  headers.set("x-angellos-user-id", userId);

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: await requestBodyWithUserId(request, userId),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return forwardRequest(request, context);
}
