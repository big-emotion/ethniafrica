import { NextResponse } from "next/server";

const ALLOWED_ORIGIN =
  process.env.CORS_ALLOWED_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "*";

const ALLOWED_METHODS = "GET,POST,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization";

// @req REQ-084
export const applyCorsHeaders = (response: Response) => {
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
};

// @req REQ-084
export const jsonWithCors = <T>(data: T, init?: ResponseInit) => {
  const response = NextResponse.json(data, init);
  return applyCorsHeaders(response);
};

// @req REQ-084
export const corsOptionsResponse = () =>
  applyCorsHeaders(new Response(null, { status: 204 }));
