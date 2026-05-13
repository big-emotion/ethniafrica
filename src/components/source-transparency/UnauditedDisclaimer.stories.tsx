import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { UnauditedDisclaimer } from "./UnauditedDisclaimer";

const meta: Meta<typeof UnauditedDisclaimer> = {
  title: "SourceTransparency/UnauditedDisclaimer",
  component: UnauditedDisclaimer,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    lastHumanAuditAt: { control: "text" },
    fiche: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof UnauditedDisclaimer>;

/** Fiche never audited — primary banner copy. */
export const NeverAudited: Story = {
  name: "Never audited (null)",
  args: {
    lastHumanAuditAt: null,
    fiche: "PPL_YORUBA",
  },
};

/** Audit older than 18 months → stale banner with long French date. */
export const StaleAudit: Story = {
  name: "Stale (> 18 months)",
  args: {
    lastHumanAuditAt: "2023-09-15T00:00:00.000Z",
    fiche: "PPL_BAMBARA",
  },
};

/** Audit within 18 months → component renders nothing. */
export const FreshAudit: Story = {
  name: "Fresh (< 18 months, renders nothing)",
  args: {
    lastHumanAuditAt: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    fiche: "PPL_FON",
  },
};

const DISMISSED_FICHE = "PPL_DISMISSED";
const DISMISSED_KEY = `unaudited-disclaimer:dismissed:${DISMISSED_FICHE}`;

function DismissedStoryHost(
  props: React.ComponentProps<typeof UnauditedDisclaimer>
) {
  // Seed localStorage *before* the disclaimer mounts so its initial state
  // reflects the dismissed flag.
  const [seeded] = useState(() => {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(DISMISSED_KEY, "1");
    return true;
  });
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DISMISSED_KEY);
      }
    };
  }, []);
  if (!seeded && typeof window !== "undefined") return null;
  return <UnauditedDisclaimer {...props} />;
}

/**
 * Dismissal already persisted in `localStorage` for this fiche — the banner
 * is suppressed even though the audit state would otherwise trigger it.
 */
export const Dismissed: Story = {
  name: "Dismissed (localStorage)",
  render: (args) => <DismissedStoryHost {...args} />,
  args: {
    lastHumanAuditAt: null,
    fiche: DISMISSED_FICHE,
  },
};
