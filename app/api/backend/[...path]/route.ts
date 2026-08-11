const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET || "";
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const FORWARDED_REQUEST_HEADERS = new Set(["content-type", "authorization"]);

function buildTargetUrl(path: string[], search: string) {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const normalizedPath = path.map(encodeURIComponent).join("/");
  return `${API_BASE_URL}/${normalizedPath}${search}`;
}

async function forwardRequest(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!DASHBOARD_SECRET) {
    return Response.json({ detail: "DASHBOARD_SECRET is not configured" }, { status: 500 });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return Response.json({ detail: "Supabase auth is not configured" }, { status: 500 });
  }

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return Response.json({ detail: "Missing session" }, { status: 401 });
  }

  const authCheck = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization,
    },
    cache: "no-store",
  });
  if (!authCheck.ok) {
    return Response.json({ detail: "Invalid session" }, { status: 401 });
  }

  const { path } = await context.params;
  const url = new URL(request.url);
  const targetUrl = buildTargetUrl(path || [], url.search);

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  headers.set("x-dashboard-secret", DASHBOARD_SECRET);

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
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

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}
