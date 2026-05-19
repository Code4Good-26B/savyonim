import { validateIntakeRideRequestInput } from "@/lib/intake-contract";

function getCommboxApiKey(): string | null {
  const value = process.env.COMMBOX_INTAKE_API_KEY?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-commbox-api-key";
  }

  return null;
}

function verifyBearerToken(request: Request): { ok: true } | { ok: false; error: string } {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return { ok: false, error: "Missing Authorization header" };
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { ok: false, error: "Authorization header must be: Bearer <api-key>" };
  }

  const expectedToken = getCommboxApiKey();
  if (!expectedToken) {
    return { ok: false, error: "COMMBOX_INTAKE_API_KEY is required in production" };
  }

  if (token !== expectedToken) {
    return { ok: false, error: "Invalid API key" };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const authResult = verifyBearerToken(request);
  if (!authResult.ok) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validation = validateIntakeRideRequestInput(parsedBody);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  // This route intentionally blocks writes until migration/type/auth prerequisites land:
  // - Issue #40 (DB schema fields + enums)
  // - Issue #41 (TypeScript type updates)
  // - Existing auth stack alignment for user-context writes
  return Response.json(
    {
      error: "Intake database write path is not enabled in this spike branch yet",
      status: "blocked",
      blocked_by: [40, 41, 35, 36],
      next_step: "After dependencies are finalized, implement transaction-safe passenger lookup/create + ride_request insert",
      validation_preview: {
        caller_full_name: validation.data.caller_full_name,
        request_for_self: validation.data.request_for_self,
        trip_type: validation.data.trip_type,
      },
    },
    { status: 501 },
  );
}
