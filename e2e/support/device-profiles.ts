// Reference device profile per TEA Test Design ASR-7.
// Mirrors playwright.config.ts so individual tests can opt into
// non-default viewports without leaking magic numbers.

export const referenceMobile = {
  viewport: { width: 430, height: 812 } as const,
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
};

// Slow-4G profile for the 10 s / 30 s persona thresholds.
// Numbers from Chrome DevTools "Slow 3G" preset reframed for 4G entry-level Android.
export const slow4G = {
  downloadKbps: 1_600,
  uploadKbps: 750,
  latencyMs: 150,
};

// CPU throttle factor — entry-level Android is ~4× slower than a dev machine.
export const cpuThrottle = 4;
