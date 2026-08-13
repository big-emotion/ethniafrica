// @req REQ-101
export function formatYearFr(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} av. J.-C.`;
  }
  return `${year}`;
}
