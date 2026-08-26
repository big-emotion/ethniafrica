/**
 * The capability probe both of the home's WebGL islands gate on (ARCH-014):
 * the hero globe and the axis panels' link graph. It proves only that a
 * context can be created — compiling and linking the shaders on it can
 * still fail, which is why each island also has a late-failure path back
 * to its committed fallback.
 *
 * It lives here rather than inside either island so the two gates cannot
 * drift apart: a probe that is stricter in one place than the other means
 * a device that gets one island and not the other, for no stated reason.
 */
// @req REQ-112
export function canCreateWebglContext(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}
