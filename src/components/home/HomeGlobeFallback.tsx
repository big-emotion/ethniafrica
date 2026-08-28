import { AfricaBasemap } from "@/components/system/AfricaBasemap";

/**
 * The committed, zero-WebGL Africa figure (REQ-112 AC2): rendered once the
 * capability check has come back negative, or once the globe has reported
 * it cannot run — see HomeGlobeStage.tsx. Not before: while the answer is
 * still unknown this figure would be shown to visitors whose globe is
 * about to appear, and a flat map that vanishes a second later reads as a
 * glitch rather than as a fallback.
 *
 * Centred, not right-aligned (REQ-115): the globe stage is the hero's
 * subject now, so its fallback reads as a body rather than a decorative
 * texture pinned to one edge.
 */
// @req REQ-112
// @req REQ-115
export function HomeGlobeFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        padding: "0 4%",
      }}
    >
      <AfricaBasemap
        style={{ maxWidth: "560px", width: "70%", opacity: 0.9 }}
      />
    </div>
  );
}

export default HomeGlobeFallback;
