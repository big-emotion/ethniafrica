import { NextResponse } from "next/server";

const ALLOWED_ORIGIN =
  process.env.CORS_ALLOWED_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "*";

const ALLOWED_METHODS = "GET,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization";

const applyCorsHeaders = (response: Response) => {
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
};

export const jsonWithCors = <T>(data: T, init?: ResponseInit) => {
  const response = NextResponse.json(data, init);
  return applyCorsHeaders(response);
};

export const corsOptionsResponse = () =>
  applyCorsHeaders(new Response(null, { status: 204 }));
