export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return;
  }

  const requestOrigin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const proxyOrigin =
    host && forwardedProto ? `${forwardedProto}://${host}` : null;

  if (origin !== requestOrigin && origin !== proxyOrigin) {
    throw new Response("Forbidden", { status: 403, statusText: "Forbidden" });
  }
}
