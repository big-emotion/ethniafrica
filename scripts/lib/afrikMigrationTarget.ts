export interface StagingTargetInput {
  target?: string;
  activeSupabaseUrl?: string;
  expectedStagingSupabaseUrl?: string;
}

export interface ValidatedStagingTarget {
  target: "staging";
  supabaseUrl: string;
}

function parseSupabaseOrigin(label: string, value?: string): string {
  if (!value?.trim()) {
    throw new Error(`${label} is required`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }

  const hasSupportedProtocol =
    url.protocol === "https:" || url.protocol === "http:";
  const isOriginOnly =
    !url.username &&
    !url.password &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash;

  if (!hasSupportedProtocol || !isOriginOnly) {
    throw new Error(`${label} must be an HTTP(S) origin`);
  }

  return url.origin;
}

export function validateStagingTarget(
  input: StagingTargetInput
): ValidatedStagingTarget {
  if (!input.target) {
    throw new Error("Migration target identity is required");
  }

  if (input.target !== "staging") {
    throw new Error('Migration target must be exactly "staging"');
  }

  const activeSupabaseUrl = parseSupabaseOrigin(
    "Active Supabase URL",
    input.activeSupabaseUrl
  );
  const expectedStagingSupabaseUrl = parseSupabaseOrigin(
    "Configured staging Supabase URL",
    input.expectedStagingSupabaseUrl
  );

  if (activeSupabaseUrl !== expectedStagingSupabaseUrl) {
    throw new Error(
      "Active Supabase URL does not match the configured staging URL"
    );
  }

  return {
    target: "staging",
    supabaseUrl: activeSupabaseUrl,
  };
}
