import { z } from "zod";

/**
 * What a reader may be asked before their message is carried.
 *
 * Civilité is offered and never demanded, and it carries a third value rather
 * than only the two gendered ones: a form that makes « Madame » or
 * « Monsieur » the only way to fill a field it then marks optional asks the
 * reader to choose between misfiling themselves and leaving the control
 * visibly untouched.
 */
// @req REQ-045
export const CONTACT_CIVILITIES = [
  "madame",
  "monsieur",
  "sans-mention",
] as const;

export type ContactCivility = (typeof CONTACT_CIVILITIES)[number];

// @req REQ-045
export const CONTACT_CIVILITY_LABEL: Record<ContactCivility, string> = {
  madame: "Madame",
  monsieur: "Monsieur",
  "sans-mention": "Sans mention",
};

/**
 * The subjects the form offers, in the order it offers them.
 *
 * They are a closed list rather than a free-text line because the subject is
 * the only field that survives into the mail header, where it is what the
 * single inbox sorts on. A typed subject arrives as a second, shorter message
 * body and sorts nothing.
 *
 * Declaration order is reading order, and it runs from the reasons the corpus
 * exists for to the ones it merely has to answer.
 */
// @req REQ-045
export const CONTACT_SUBJECTS = [
  { value: "correction", label: "Signaler une erreur ou une imprécision" },
  { value: "source", label: "Proposer une source" },
  { value: "contribution", label: "Proposer une contribution" },
  { value: "reutilisation", label: "Réutiliser les données" },
  { value: "presse", label: "Presse, recherche et partenariats" },
  { value: "donnees-personnelles", label: "Données personnelles" },
  { value: "autre", label: "Autre demande" },
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]["value"];

const CONTACT_SUBJECT_VALUES = CONTACT_SUBJECTS.map(
  (subject) => subject.value
) as [ContactSubject, ...ContactSubject[]];

/** The label the reader picked, for the mail the recipient reads. */
// @req REQ-045
export function subjectLabel(subject: ContactSubject): string {
  return (
    CONTACT_SUBJECTS.find((entry) => entry.value === subject)?.label ?? subject
  );
}

/**
 * A `<select>` with no choice made posts an empty string, not an absent key,
 * so the empty string has to mean the same thing as the missing field or the
 * optional civility rejects every message that leaves it alone.
 */
const blankAsUnstated = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    schema
  );

/**
 * A ceiling the recipient can be asked to read. Past it the form is a way of
 * mailing a payload rather than a message, and the floor exists for the
 * mirror reason: « bonjour » is not something the inbox can act on.
 */
const MESSAGE_FLOOR = 10;
const MESSAGE_CEILING = 5000;

// @req REQ-045
export const contactMessageSchema = z.object({
  civility: blankAsUnstated(z.enum(CONTACT_CIVILITIES).optional()),
  firstName: z
    .string()
    .trim()
    .min(1, "Indiquez votre prénom.")
    .max(80, "Ce prénom dépasse 80 caractères."),
  lastName: z
    .string()
    .trim()
    .min(1, "Indiquez votre nom.")
    .max(80, "Ce nom dépasse 80 caractères."),
  email: z
    .email("Cette adresse électronique n'est pas valide.")
    .max(254, "Cette adresse électronique dépasse 254 caractères."),
  subject: z.enum(CONTACT_SUBJECT_VALUES, {
    error: "Choisissez un objet.",
  }),
  message: z
    .string()
    .trim()
    .min(MESSAGE_FLOOR, "Décrivez votre demande en quelques mots.")
    .max(MESSAGE_CEILING, `Ce message dépasse ${MESSAGE_CEILING} caractères.`),
  /** Never rendered to a human; a value here means the sender was not one. */
  honeypot: z.string().optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
