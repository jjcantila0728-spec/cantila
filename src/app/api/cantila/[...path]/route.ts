/* ============================================================
   Cantila Console → Control Plane proxy.
   Forwards /api/cantila/* to the control plane HTTP API (default
   http://localhost:8080). Lives server-side so cookies, auth and
   any future signing stay out of the browser.

   Configure the target with CANTILA_CONTROL_PLANE_URL — for
   example in cantila-console/.env.local:
       CANTILA_CONTROL_PLANE_URL=http://localhost:8080
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const TARGET =
  process.env.CANTILA_CONTROL_PLANE_URL ?? "http://localhost:8080";

/** When the control plane requires auth, the Console can authenticate every
 *  outbound request with a server-side key. Set CANTILA_API_KEY in
 *  cantila-console/.env.local. Never expose to the browser. */
const SERVER_API_KEY = process.env.CANTILA_API_KEY;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function forward(req: NextRequest, segments: string[]) {
  const target = new URL(TARGET);
  target.pathname =
    target.pathname.replace(/\/$/, "") + "/" + segments.join("/");
  const incoming = new URL(req.url);
  incoming.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  // Forward only safe headers — never the host header, which would point
  // the control plane back at the Next.js port.
  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  // Auth precedence: a caller-supplied Authorization header wins (CLI /
  // typed-client scenarios); then the signed-in user's Console session
  // (the `cantila_session` cookie) — so the control plane scopes the
  // request to that user's account, not the shared server key; then the
  // Console's server-side key as a last resort (e.g. the public /status
  // page, which has no session). Plan §5.4.
  const auth = req.headers.get("authorization");
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (auth) headers.set("authorization", auth);
  else if (sessionToken)
    headers.set("authorization", `Bearer ${sessionToken}`);
  else if (SERVER_API_KEY) headers.set("authorization", `Bearer ${SERVER_API_KEY}`);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(target.toString(), init);
    const responseHeaders = new Headers();
    const upstreamCt = res.headers.get("content-type") ?? "";
    if (upstreamCt) responseHeaders.set("content-type", upstreamCt);

    // For SSE (text/event-stream) we MUST keep the body as a stream so each
    // frame reaches the client as soon as the upstream writes it. Buffering
    // (arrayBuffer) would delay every step until the deploy completes.
    if (upstreamCt.includes("text/event-stream")) {
      responseHeaders.set("cache-control", "no-cache, no-transform");
      responseHeaders.set("connection", "keep-alive");
      responseHeaders.set("x-accel-buffering", "no");
      return new NextResponse(res.body, {
        status: res.status,
        headers: responseHeaders,
      });
    }

    // 1xx / 204 / 205 / 304 responses MUST not carry a body — the Response
    // constructor throws on `new Response(buffer, { status: 204 })`. Pass
    // null in those cases.
    const noBody =
      res.status === 204 ||
      res.status === 205 ||
      res.status === 304 ||
      (res.status >= 100 && res.status < 200);
    const body = noBody ? null : await res.arrayBuffer();
    return new NextResponse(body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "control-plane-unreachable",
        message:
          err instanceof Error ? err.message : "failed to reach control plane",
        target: target.toString(),
      },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return forward(req, params.path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return forward(req, params.path);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return forward(req, params.path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return forward(req, params.path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return forward(req, params.path);
}
