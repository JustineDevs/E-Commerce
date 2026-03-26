import { NextResponse } from "next/server";

export function tagResponse(
  res: NextResponse,
  correlationId: string,
): NextResponse {
  res.headers.set("x-request-id", correlationId);
  return res;
}

export function correlatedJson(
  correlationId: string,
  body: unknown,
  init?: Parameters<typeof NextResponse.json>[1],
): NextResponse {
  const res = NextResponse.json(body, init);
  return tagResponse(res, correlationId);
}
