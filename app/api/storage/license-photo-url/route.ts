import { verifySupabaseJwt } from "@/lib/api-auth";
import { createSupabaseClient, readBearerToken } from "@/lib/supabase";

export const runtime = "nodejs";

const BUCKET = "license-photos";
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const claims = verifySupabaseJwt(token);
  if (!claims) {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "";

  if (!filename) return Response.json({ error: "filename is required" }, { status: 400 });
  if (!contentType || !ALLOWED_MIME.has(contentType)) {
    return Response.json(
      { error: "contentType must be image/jpeg, image/png, or image/webp" },
      { status: 400 },
    );
  }

  // Namespace the path by userId so RLS can enforce ownership
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${claims.sub}/${Date.now()}-${safeFilename}`;

  const supabase = createSupabaseClient(); // service role for admin storage ops
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return Response.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  return Response.json({ uploadUrl: data.signedUrl, path }, { status: 200 });
}
