// This module holds SUPABASE_SERVICE_ROLE_KEY, which bypasses every RLS policy.
// `server-only` is what actually keeps it out of a client bundle: importing this
// file from a client component fails the build. The comment that used to stand
// here in its place stopped nothing.
import "server-only";

/**
 * Client Supabase admin (pour modération)
 * Utilise la service role key pour bypasser RLS
 */
import { createClient } from "@supabase/supabase-js";

import {
  SUPABASE_REQUEST_TIMEOUT_MS,
  createFetchWithDeadline,
} from "./requestDeadline";

interface AdminClientOptions {
  /**
   * How long one request may take before it is abandoned. Defaults to the
   * page deadline; a batch caller that legitimately reads for tens of seconds
   * passes `SUPABASE_BATCH_REQUEST_TIMEOUT_MS` instead. Naming it at the call
   * site keeps the widened deadline with the one job that needs it, rather
   * than relaxing it for every reader of this client.
   */
  requestTimeoutMs?: number;
}

// @req REQ-054
export const createAdminClient = ({
  requestTimeoutMs = SUPABASE_REQUEST_TIMEOUT_MS,
}: AdminClientOptions = {}) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createFetchWithDeadline(requestTimeoutMs),
    },
  });
};
