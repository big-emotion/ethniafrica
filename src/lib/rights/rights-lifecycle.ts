export type PublicEligibilityInput = {
  rightsBasis?: string | null;
  consentScope?: string | null;
  visibility?: string | null;
  embargoUntil?: string | null;
  retentionUntil?: string | null;
  withdrawnAt?: string | null;
  communityReviewStatus?: string | null;
};

export type PublicEligibilityState = {
  publicEligible: boolean;
  accessState: "public" | "blocked";
  evaluatedAt: string;
};

function hasExplicitRights(rightsBasis: string | null | undefined): boolean {
  const normalized = rightsBasis?.trim().toLowerCase();

  return Boolean(
    normalized &&
    normalized !== "unknown" &&
    normalized !== "ambiguous" &&
    normalized !== "pending"
  );
}

function isInvalidOrBeforeNow(
  value: string | null | undefined,
  now: Date
): boolean {
  if (!value) return false;

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return true;

  return deadline.getTime() < now.getTime();
}

function isInvalidOrAfterNow(
  value: string | null | undefined,
  now: Date
): boolean {
  if (!value) return false;

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return true;

  return deadline.getTime() > now.getTime();
}

// @req REQ-096
export function evaluatePublicEligibility(
  record: PublicEligibilityInput,
  now = new Date()
): PublicEligibilityState {
  const isEligible =
    hasExplicitRights(record.rightsBasis) &&
    record.consentScope === "public" &&
    record.visibility === "public" &&
    record.communityReviewStatus === "approved" &&
    !record.withdrawnAt &&
    !isInvalidOrAfterNow(record.embargoUntil, now) &&
    !isInvalidOrBeforeNow(record.retentionUntil, now);

  return {
    publicEligible: isEligible,
    accessState: isEligible ? "public" : "blocked",
    evaluatedAt: now.toISOString(),
  };
}
