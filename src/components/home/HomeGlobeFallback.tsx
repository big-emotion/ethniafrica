import { AfricaBasemap } from "@/components/system/AfricaBasemap";

/**
 * The committed, zero-WebGL Africa figure (REQ-112 AC2): rendered whenever
 * no WebGL context can be created, and unconditionally before that
 * capability check has run — see HomeGlobeStage.tsx — so the hero is never
 * empty and the server response never carries the WebGL runtime.
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
