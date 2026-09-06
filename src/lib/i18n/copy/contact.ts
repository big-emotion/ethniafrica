import type {
  ContactCivility,
  ContactSubject,
} from "@/lib/validations/contact";
import type {
  DidYouKnowEntityKind,
  DidYouKnowTier,
} from "@/lib/home/didYouKnowFacts";
import type { Language } from "@/types/shared";

const en = {
  metadataTitle: "Contact us",
  metadataDescription:
    "Write to the atlas: report an error, suggest a source or discuss reusing the data.",
  eyebrow: "Write to the atlas",
  title: "Contact us",
  introduction:
    "An error in a fiche, a source to add to the corpus, or a use of the data to discuss: write to us. Every message reaches the same inbox, and your chosen subject sorts it.",
  formTitle: "Send a message",
  requiredFields: "Fields marked with an asterisk are required.",
  civility: "Title",
  selectCivility: "Select…",
  civilities: {
    madame: "Ms",
    monsieur: "Mr",
    "sans-mention": "Prefer not to say",
  } satisfies Record<ContactCivility, string>,
  firstName: "First name *",
  lastName: "Last name *",
  email: "Email address *",
  subject: "Subject *",
  selectSubject: "Select a subject",
  subjects: {
    correction: "Report an error or inaccuracy",
    source: "Suggest a source",
    contribution: "Suggest a contribution",
    reutilisation: "Reuse the data",
    presse: "Press, research and partnerships",
    "donnees-personnelles": "Personal data",
    autre: "Another request",
  } satisfies Record<ContactSubject, string>,
  message: "Message *",
  messagePlaceholder: "Describe your request…",
  honeypot: "Leave this field blank",
  sending: "Sending…",
  send: "Send message",
  sent: "Your message has been sent. We will reply to the address you provided.",
  sendFailed: (email: string) =>
    `Your message could not be sent. Write to us directly at ${email}.`,
  emailEyebrow: "Email address",
  emailHelp:
    "The form writes to this address. We reply to the address you provide.",
  didYouKnow: "Did you know?",
  entityLabels: {
    people: "People",
    country: "Country",
    family: "Language family",
  } satisfies Record<DidYouKnowEntityKind, string>,
  tierLabels: {
    official: "Official source",
    referenced: "Referenced source",
    unverified: "Unverified source",
  } satisfies Record<DidYouKnowTier, string>,
};

type ContactCopy = typeof en;

const fr: ContactCopy = {
  metadataTitle: "Contactez-nous",
  metadataDescription:
    "Écrire à l'atlas : signaler une erreur, proposer une source, demander une réutilisation des données.",
  eyebrow: "Écrire à l'atlas",
  title: "Contactez-nous",
  introduction:
    "Une erreur sur une fiche, une source à verser au corpus, une réutilisation des données à discuter : écrivez-nous. Chaque message arrive dans la même boîte, et l'objet que vous choisissez est ce qui la trie.",
  formTitle: "Envoyer un message",
  requiredFields: "Les champs marqués d'un astérisque sont obligatoires.",
  civility: "Civilité",
  selectCivility: "Sélectionnez…",
  civilities: {
    madame: "Madame",
    monsieur: "Monsieur",
    "sans-mention": "Sans mention",
  },
  firstName: "Prénom *",
  lastName: "Nom *",
  email: "Adresse électronique *",
  subject: "Objet *",
  selectSubject: "Sélectionnez un objet",
  subjects: {
    correction: "Signaler une erreur ou une imprécision",
    source: "Proposer une source",
    contribution: "Proposer une contribution",
    reutilisation: "Réutiliser les données",
    presse: "Presse, recherche et partenariats",
    "donnees-personnelles": "Données personnelles",
    autre: "Autre demande",
  },
  message: "Message *",
  messagePlaceholder: "Décrivez votre demande…",
  honeypot: "Ne remplissez pas ce champ",
  sending: "Envoi en cours…",
  send: "Envoyer le message",
  sent: "Votre message est bien parti. Nous vous répondons à l'adresse que vous avez indiquée.",
  sendFailed: (email) =>
    `Votre message n'a pas pu être envoyé. Écrivez-nous directement à ${email}.`,
  emailEyebrow: "Adresse électronique",
  emailHelp:
    "Le formulaire écrit à cette adresse. Nous répondons à celle que vous indiquez.",
  didYouKnow: "Saviez-vous que",
  entityLabels: {
    people: "Peuple",
    country: "Pays",
    family: "Famille linguistique",
  },
  tierLabels: {
    official: "Source officielle",
    referenced: "Source référencée",
    unverified: "Source non vérifiée",
  },
};

// @req REQ-145
export const contactCopy: Record<Language, ContactCopy> = { en, fr };
