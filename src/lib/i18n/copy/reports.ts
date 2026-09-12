import type { Language } from "@/types/shared";

const en = {
  page: {
    metadataTitle: "Report an error",
    title: "Report an error",
    accuracyTitle: "Help improve the accuracy of the data",
    accuracyIntroduction:
      "The information on this site comes from different public and collaborative sources. Although we make every effort to verify and consolidate the data, some information may be incomplete, approximate or incorrect.",
    formIntroduction:
      "Describe what is wrong below. No account is required, and both a suggested correction and a source are optional: we prefer an incomplete report to one you decide not to send.",
    ficheGuidanceBefore: "If the error is on a specific page, the",
    reportButton: "Report",
    ficheGuidanceAfter:
      "button in that page's reading bar targets the relevant chapter directly — it is faster for you and more precise for moderation.",
    openAtlas: "Open the atlas of peoples",
    followUpTitle: "What happens to reports",
    followUp:
      "All reports are public, from submission to decision. You can see those under review and those that have been decided, together with the reason given for each decision.",
    viewRegister: "View the report register",
  },
  form: {
    targetTitle: "Reported item",
    targetLabels: {
      people: "People",
      country: "Country",
      language: "Language",
      language_family: "Language family",
      fiche_section: "Page section",
      assertion: "Assertion",
      source: "Source",
      general: "General report",
    } as Record<string, string>,
    reason: "What is wrong?",
    correctionDisclosure: "Do you know the correct answer?",
    proposedRewrite: "Suggested correction",
    decisionDisclosure: "Would you like to know the decision?",
    reporterEmail: "Your email address",
    emailHelp:
      "We will send you a link to confirm this address, followed by the moderation decision. It is never displayed publicly or used for any other purpose.",
    sourceDisclosure: "Do you have a source?",
    sourcesLegend: "Supporting sources",
    sourceHelp: "Add a link or citation if you have one.",
    sourceRequired: "Add at least one link or citation.",
    counterSourceUrl: "Counter-source link",
    counterSourceCitation: "Counter-source citation",
    cancel: "Cancel",
    send: "Send",
    sending: "Sending…",
    honeypot: "Leave this field blank",
    verification: "Anti-bot verification",
    verificationPlaceholder: "The anti-bot verification will load here.",
    verificationIncomplete:
      "The anti-bot verification is not complete. Wait a moment.",
    verificationFailed:
      "The anti-bot verification failed. Reload the page to try again.",
    submissionFailed: "The report could not be sent. Try again.",
    invalidUrl: "Enter a valid HTTP or HTTPS address.",
    citationTooLong: "The citation cannot exceed 2,000 characters.",
    invalidReason:
      "The description must contain between 10 and 2,000 characters.",
    invalidEmail: "Enter a valid email address, or leave the field blank.",
    successTitle: "Report submitted",
    successWithEmail:
      "Thank you — confirm your address using the message we have just sent, and you will receive the moderation decision.",
    successAnonymous:
      "Thank you — your report is available below, where its status will be updated.",
    viewReport: "View the report",
  },
  dialog: {
    trigger: "Report",
    title: "Report a problem",
    description: "Report form for this item.",
    saved: "report submitted",
  },
  detail: {
    metadataDescription: "View an editorial report on the platform.",
    report: "Report",
    sectionName: "Reports",
    targetTitle: "Reported item",
    type: "Type",
    identifier: "Identifier",
    field: "Field",
    detailsTitle: "Report details",
    kind: {
      inaccurate: "Inaccurate information",
      missingSource: "Missing source",
      brokenUrl: "Broken URL",
      offensive: "Offensive content",
      correctionProposal: "Correction proposal",
      other: "Other",
    },
    counterSource: "Contradictory source",
    proposedRewrite: "Suggested rewrite",
    reportedOn: "Reported on",
    resolvedOn: "Resolved on",
    by: "By",
  },
  verification: {
    metadataTitle: "Confirm your email address",
    verified: {
      title: "Email address confirmed",
      body: "You will receive a message as soon as moderation has decided on your report.",
    },
    alreadyVerified: {
      title: "Email address already confirmed",
      body: "This link has already been used. There is nothing else to do: your email address is registered.",
    },
    expired: {
      title: "Expired link",
      body: "This confirmation link was valid for 24 hours. Your report is still registered and publicly available — only the email notification can no longer be sent.",
    },
    unknown: {
      title: "Unknown link",
      body: "This link does not match a pending confirmation. If you submitted a report, it is registered and available in the public register.",
    },
    viewReport: "View your report",
    viewRegister: "View the report register",
  },
};

type ReportsCopy = typeof en;

const fr: ReportsCopy = {
  page: {
    metadataTitle: "Signalez une erreur",
    title: "Signalez une erreur",
    accuracyTitle: "Contribuez à l'exactitude des données",
    accuracyIntroduction:
      "Les informations présentées sur ce site proviennent de différentes sources, publiques ou collaboratives. Bien que nous fassions de notre mieux pour vérifier et consolider ces données, certaines peuvent être incomplètes, approximatives ou contenir des erreurs.",
    formIntroduction:
      "Décrivez ci-dessous ce qui ne va pas. Aucun compte n'est nécessaire, et la correction proposée comme la source sont facultatives : nous préférons un signalement incomplet à un signalement que vous renoncez à écrire.",
    ficheGuidanceBefore:
      "Si l'erreur se trouve sur une page précise, le bouton",
    reportButton: "Signaler",
    ficheGuidanceAfter:
      "de la barre de lecture de cette page vise directement le chapitre concerné — c'est plus rapide pour vous et plus précis pour la modération.",
    openAtlas: "Ouvrir l'atlas des peuples",
    followUpTitle: "Ce que deviennent les signalements",
    followUp:
      "Tous les signalements sont publics, du dépôt à la décision. Vous pouvez consulter ceux qui sont en cours d'examen et ceux qui ont été tranchés, ainsi que le motif retenu à chaque fois.",
    viewRegister: "Voir le registre des signalements",
  },
  form: {
    targetTitle: "Élément signalé",
    targetLabels: {
      people: "Peuple",
      country: "Pays",
      language: "Langue",
      language_family: "Famille linguistique",
      fiche_section: "Section de page",
      assertion: "Affirmation",
      source: "Source",
      general: "Signalement général",
    },
    reason: "Qu'est-ce qui ne va pas ?",
    correctionDisclosure: "Vous connaissez la bonne réponse ?",
    proposedRewrite: "Proposition de correction",
    decisionDisclosure: "Vous voulez connaître la décision ?",
    reporterEmail: "Votre adresse e-mail",
    emailHelp:
      "Nous vous enverrons un lien pour confirmer cette adresse, puis la décision de la modération. Elle n'apparaît jamais publiquement et ne sert à rien d'autre.",
    sourceDisclosure: "Vous avez une source ?",
    sourcesLegend: "Sources à l'appui",
    sourceHelp: "Ajoutez un lien ou une citation si vous en disposez.",
    sourceRequired: "Ajoutez au moins un lien ou une citation.",
    counterSourceUrl: "Lien de la contre-source",
    counterSourceCitation: "Citation de la contre-source",
    cancel: "Annuler",
    send: "Envoyer",
    sending: "Envoi en cours…",
    honeypot: "Ne remplissez pas ce champ",
    verification: "Vérification anti-robot",
    verificationPlaceholder: "La vérification anti-robot sera chargée ici.",
    verificationIncomplete:
      "La vérification anti-robot n'est pas terminée. Patientez un instant.",
    verificationFailed:
      "La vérification anti-robot n'a pas abouti. Rechargez la page pour réessayer.",
    submissionFailed: "L’envoi du signalement a échoué. Réessayez.",
    invalidUrl: "Saisissez une adresse HTTP ou HTTPS valide.",
    citationTooLong: "La citation ne peut pas dépasser 2 000 caractères.",
    invalidReason: "La description doit contenir entre 10 et 2 000 caractères.",
    invalidEmail:
      "Saisissez une adresse e-mail valide, ou laissez le champ vide.",
    successTitle: "Signalement enregistré",
    successWithEmail:
      "Merci — confirmez votre adresse depuis le message que nous venons de vous envoyer, et vous recevrez la décision de la modération.",
    successAnonymous:
      "Merci — votre signalement est consultable ci-dessous, et son statut y sera mis à jour.",
    viewReport: "Consulter le signalement",
  },
  dialog: {
    trigger: "Signaler",
    title: "Signaler un problème",
    description: "Formulaire de signalement pour cet élément.",
    saved: "signalement enregistré",
  },
  detail: {
    metadataDescription:
      "Consultation d'un signalement éditorial sur la plateforme.",
    report: "Signalement",
    sectionName: "Signalements",
    targetTitle: "Élément concerné",
    type: "Type",
    identifier: "Identifiant",
    field: "Champ",
    detailsTitle: "Détails du signalement",
    kind: {
      inaccurate: "Information inexacte",
      missingSource: "Source manquante",
      brokenUrl: "URL brisée",
      offensive: "Contenu offensant",
      correctionProposal: "Proposition de correction",
      other: "Autre",
    },
    counterSource: "Source contradictoire",
    proposedRewrite: "Proposition de réécriture",
    reportedOn: "Signalé le",
    resolvedOn: "Résolu le",
    by: "Par",
  },
  verification: {
    metadataTitle: "Confirmation de votre adresse",
    verified: {
      title: "Adresse confirmée",
      body: "Vous recevrez un message dès que la modération aura tranché sur votre signalement.",
    },
    alreadyVerified: {
      title: "Adresse déjà confirmée",
      body: "Ce lien avait déjà été utilisé. Rien à faire de plus : votre adresse est bien enregistrée.",
    },
    expired: {
      title: "Lien expiré",
      body: "Ce lien de confirmation avait une validité de 24 heures. Votre signalement, lui, est toujours enregistré et consultable — seule la notification par e-mail ne pourra pas vous être envoyée.",
    },
    unknown: {
      title: "Lien inconnu",
      body: "Ce lien ne correspond à aucune confirmation en attente. Si vous avez envoyé un signalement, il est enregistré et consultable dans le registre public.",
    },
    viewReport: "Consulter votre signalement",
    viewRegister: "Voir le registre des signalements",
  },
};

// @req REQ-145
export const reportsCopy: Record<Language, ReportsCopy> = { en, fr };
