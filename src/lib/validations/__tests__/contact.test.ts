import { describe, expect, it } from "vitest";

import {
  CONTACT_CIVILITIES,
  CONTACT_SUBJECTS,
  contactMessageSchema,
  subjectLabel,
} from "@/lib/validations/contact";

/** The same message minus one field, the way a form posts an untouched one. */
function without(field: keyof typeof validMessage) {
  const partial: Record<string, unknown> = { ...validMessage };
  delete partial[field];
  return partial;
}

const validMessage = {
  civility: "madame",
  firstName: "Aminata",
  lastName: "Diallo",
  email: "aminata@example.org",
  subject: "correction",
  message: "La fiche Peul cite une population de 1998, la source est datée.",
};

describe("contactMessageSchema", () => {
  // @req REQ-045
  it("accepts a complete message", () => {
    expect(contactMessageSchema.safeParse(validMessage).success).toBe(true);
  });

  // @req REQ-045
  it("carries a message whose civility is left unstated", () => {
    expect(contactMessageSchema.safeParse(without("civility")).success).toBe(
      true
    );
  });

  // @req REQ-045
  it("treats an empty civility the way a browser sends one: as unstated", () => {
    const parsed = contactMessageSchema.safeParse({
      ...validMessage,
      civility: "",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.civility).toBeUndefined();
  });

  // @req REQ-045
  it.each(["firstName", "lastName", "email", "subject", "message"] as const)(
    "refuses a message with no %s",
    (field) => {
      expect(contactMessageSchema.safeParse(without(field)).success).toBe(
        false
      );
    }
  );

  // @req REQ-045
  it("refuses a name made only of spaces", () => {
    const parsed = contactMessageSchema.safeParse({
      ...validMessage,
      firstName: "   ",
    });

    expect(parsed.success).toBe(false);
  });

  // @req REQ-045
  it("refuses an address that is not one", () => {
    const parsed = contactMessageSchema.safeParse({
      ...validMessage,
      email: "aminata(at)example.org",
    });

    expect(parsed.success).toBe(false);
  });

  // @req REQ-045
  it("refuses a subject the form never offered", () => {
    const parsed = contactMessageSchema.safeParse({
      ...validMessage,
      subject: "partenariat-publicitaire",
    });

    expect(parsed.success).toBe(false);
  });

  // @req REQ-045
  it("refuses a message too short to act on", () => {
    const parsed = contactMessageSchema.safeParse({
      ...validMessage,
      message: "bonjour",
    });

    expect(parsed.success).toBe(false);
  });

  /**
   * The recipient reads what arrives, so an unbounded body is a way of
   * mailing a payload rather than a message.
   */
  // @req REQ-045
  it("refuses a body past the ceiling the inbox can be asked to read", () => {
    const parsed = contactMessageSchema.safeParse({
      ...validMessage,
      message: "e".repeat(5001),
    });

    expect(parsed.success).toBe(false);
  });

  // @req REQ-045
  it("trims the message it hands on, so the mail carries no leading blank", () => {
    const parsed = contactMessageSchema.safeParse({
      ...validMessage,
      firstName: "  Aminata  ",
    });

    expect(parsed.success && parsed.data.firstName).toBe("Aminata");
  });
});

describe("contact form vocabulary", () => {
  // @req REQ-045
  it("offers a civility that files nobody, so the field can be answered honestly", () => {
    expect(CONTACT_CIVILITIES).toContain("sans-mention");
  });

  /**
   * The subject is the only field that reaches the inbox as a sorting key, so
   * a duplicated value would silently merge two desks into one.
   */
  // @req REQ-045
  it("gives every subject a distinct value", () => {
    const values = CONTACT_SUBJECTS.map((subject) => subject.value);

    expect(new Set(values).size).toBe(values.length);
  });

  // @req REQ-045
  it("names every subject in the reader's language", () => {
    for (const subject of CONTACT_SUBJECTS) {
      expect(subject.label.length).toBeGreaterThan(0);
      expect(subject.label).not.toBe(subject.value);
    }
  });

  // @req REQ-045
  it("reads a subject back as the label the reader chose", () => {
    expect(subjectLabel("correction")).toBe(CONTACT_SUBJECTS[0].label);
  });
});
