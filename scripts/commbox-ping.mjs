#!/usr/bin/env node
/**
 * Verifies Commbox API connectivity and credential validity before deployment.
 * Run: npm run commbox:ping
 *
 * Exit 0 = reachable and API key accepted.
 * Exit 1 = unreachable, auth failure, or missing required env vars.
 */

const apiKey = process.env.COMMBOX_API_KEY;
const apiUrl = (process.env.COMMBOX_API_URL ?? "https://api.commbox.io").replace(/\/$/, "");
const templateId = process.env.COMMBOX_TEMPLATE_ID;

console.log("[commbox:ping] Checking Commbox API...");
console.log(`  URL:         ${apiUrl}`);
console.log(`  API Key:     ${apiKey ? `${apiKey.slice(0, 4)}${"*".repeat(Math.max(0, apiKey.length - 4))}` : "(not set)"}`);
console.log(`  Template ID: ${templateId ?? "(not set)"}`);
console.log();

if (!apiKey) {
  console.error("[commbox:ping] FAIL: COMMBOX_API_KEY is not set.");
  console.error("  Set it in your environment or via `vercel env pull` before deploying.");
  process.exit(1);
}

if (!templateId) {
  console.warn("[commbox:ping] WARN: COMMBOX_TEMPLATE_ID is not set.");
  console.warn("  Driver notifications will fail at runtime until this is configured.");
}

let response;
try {
  response = await fetch(`${apiUrl}/v1/messages`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8_000),
  });
} catch (err) {
  console.error(`[commbox:ping] FAIL: Could not reach ${apiUrl}`);
  console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
  console.error("  Check that COMMBOX_API_URL is correct and the network is reachable.");
  process.exit(1);
}

if (response.status === 401 || response.status === 403) {
  const body = await response.text().catch(() => "");
  console.error(`[commbox:ping] FAIL: API returned ${response.status} — API key is invalid or unauthorized.`);
  if (body) console.error(`  Response: ${body}`);
  console.error("  Check the value of COMMBOX_API_KEY.");
  process.exit(1);
}

// Any non-auth-error response means the endpoint is reachable and the key is accepted.
console.log(`[commbox:ping] OK: Commbox API reachable, responded with HTTP ${response.status}.`);
if (templateId) {
  console.log("[commbox:ping] All required env vars are set. Ready for real notifications.");
} else {
  console.log("[commbox:ping] Set COMMBOX_TEMPLATE_ID before going live.");
}
