export async function POST(request: Request) {
  // In Phase 2, this just logs and returns a success response
  // to act as a stub for broadcasting "new rides available"
  console.log("[Mock Broadcast] New rides available");
  return Response.json({ success: true, message: "Mock broadcast sent" });
}

export async function GET(request: Request) {
  return Response.json({ success: true, message: "Mock broadcast endpoint ready. Use POST to trigger." });
}
