/**
 * IP truncation for audit logs.
 *
 * For privacy reasons, audit log entries should not store full client IPs.
 *   - IPv4 → /24 (zero out the last octet, e.g. 192.168.1.42 → 192.168.1.0)
 *   - IPv6 → /48 (keep the first 3 hextets, drop the rest, e.g.
 *                 2001:0db8:85a3:0000:0000:8a2e:0370:7334 → 2001:db8:85a3::)
 *
 * Returns null for null, undefined, empty strings or anything that cannot be
 * parsed as a valid IPv4 / IPv6 address. The caller is expected to pass the
 * truncated value through to Postgres' INET column (or null).
 */
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip || typeof ip !== "string") {
    return null;
  }

  const trimmed = ip.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // IPv4 detection: dotted quad with no colons.
  if (!trimmed.includes(":")) {
    return truncateIpv4(trimmed);
  }

  return truncateIpv6(trimmed);
}

function truncateIpv4(ip: string): string | null {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }

  for (let i = 0; i < 4; i++) {
    const part = parts[i];
    if (!/^\d+$/.test(part)) {
      return null;
    }
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return null;
    }
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

function truncateIpv6(ip: string): string | null {
  // Expand the "::" abbreviation to a full 8-hextet form.
  const expanded = expandIpv6(ip);
  if (!expanded) {
    return null;
  }

  // Keep the first 3 hextets, /48 prefix. Use shortened hextet form (no
  // leading zeros) so the output matches Postgres INET's canonical form.
  const head = expanded.slice(0, 3).map((h) => h.replace(/^0+(?=.)/, ""));
  return `${head.join(":")}::`;
}

function expandIpv6(ip: string): string[] | null {
  if (ip.includes(":::")) {
    return null;
  }

  // Split on "::" — at most one occurrence is allowed.
  const doubleColonCount = (ip.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    return null;
  }

  let hextets: string[];

  if (doubleColonCount === 1) {
    const [head, tail] = ip.split("::");
    const headParts = head === "" ? [] : head.split(":");
    const tailParts = tail === "" ? [] : tail.split(":");
    const missing = 8 - (headParts.length + tailParts.length);
    if (missing < 0) {
      return null;
    }
    const zeros = new Array(missing).fill("0");
    hextets = [...headParts, ...zeros, ...tailParts];
  } else {
    hextets = ip.split(":");
  }

  if (hextets.length !== 8) {
    return null;
  }

  for (const hextet of hextets) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(hextet)) {
      return null;
    }
  }

  return hextets.map((h) => h.toLowerCase());
}
