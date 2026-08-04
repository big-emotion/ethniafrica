// Hard accent-tint offset shadow + 170ms ease-out; motion-safe gates both the transition and the shadow itself, not just the animation, matching motion.css's reduced-motion contract.
export const CHARTER_HOVER_LIFT =
  "motion-safe:transition-shadow motion-safe:duration-[170ms] motion-safe:ease-[var(--afh-ease-out)] motion-safe:hover:shadow-[4px_4px_0_0_var(--accent-tint)]";

export const CHARTER_FOCUS_RING =
  "focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]";
