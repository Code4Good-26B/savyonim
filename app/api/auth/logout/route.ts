export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const portal = url.searchParams.get("portal") ?? "representative";

  const cookieName =
    portal === "admin" ? "savionim-admin-token" : "savionim-rep-token";

  const response = Response.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  );
  return response;
}
