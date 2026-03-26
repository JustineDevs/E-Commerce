import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  registerSseClient,
  unregisterSseClient,
} from "@/lib/admin-sse-hub";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.email ?? "anon";

  const stream = new ReadableStream({
    start(controller) {
      const client = registerSseClient(controller, userId);
      controller.enqueue(
        new TextEncoder().encode(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`),
      );
      req.signal.addEventListener("abort", () => {
        unregisterSseClient(client);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
