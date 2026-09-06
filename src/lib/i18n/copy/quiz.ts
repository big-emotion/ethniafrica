import type { Language } from "@/types/shared";

/**
 * The quiz surface's own dictionary.
 *
 * Its own file rather than a branch of the façade because the play island is
 * budgeted: it ships under 15 KB gzipped (scripts/quiz-bundle-size.ts), and
 * importing the whole site dictionary for thirty labels once broke that
 * budget on +0.58 KB of unrelated copy. The island reads this module only.
 */
const en = {
  navLabel: "Quiz",
  pageTitle: "What do you want to play on?",
  pageSubtitle:
    "A country, a family of languages, a topic — or the whole continent. Eight questions each time.",
  scopeThemeHeading: "A topic",
  scopeCountryHeading: "A country",
  scopeFamilyHeading: "A family of languages",
  scopeCountryHint: "Tap a country: the topics it can fill unfold.",
  scopeThemePanelHint: "Choose a topic, or play the whole country.",
  scopeThemePanelNoTheme: "Play without a theme",
  scopeMixedHint:
    "Eight questions drawn from the whole corpus, from the best-known peoples to the least documented.",
  scopeRandomHint: "Eight questions at random, in no order of difficulty.",
  leaveSession: "Leave the quiz",
  seeScoreCard: "See the score card",
  comingSoon:
    "the questions for this selection are on their way — the corresponding fiches are being verified",
  validate: "Confirm",
  questionProgressPrefix: "question",
  questionProgressSeparator: "of",
  correctVerdict: "Correct!",
  incorrectVerdict: "Not quite",
  correctAnswerLabel: "Answer: ",
  openSourceChain: "Open the chain of sources",
  nextQuestion: "Next question",
  seeScore: "See the score",
  loadingSession: "Loading the session…",
  emptySession: "No question is available on this topic — try again later.",
  backToPicker: "Choose something else",
  sessionError: "This session could not be loaded — try again in a moment.",
  scoreHeading: "Score",
  scoreFractionSeparator: "correct answers out of",
  playAgain: "Play again",
  scoreCardExactAnswersSeparator: "exact answers out of",
  fichesEncounteredLabel: "Fiches encountered",
  shareScoreLabel: "Share the score",
  copiedFeedback: "copied",
  ogSourcedLine: "every answer is sourced",
};

type QuizCopy = typeof en;

const fr: QuizCopy = {
  navLabel: "Quiz",
  pageTitle: "Sur quoi veux-tu jouer ?",
  pageSubtitle:
    "Un pays, une famille de langues, un sujet — ou tout le continent. Huit questions à chaque fois.",
  scopeThemeHeading: "Un sujet",
  scopeCountryHeading: "Un pays",
  scopeFamilyHeading: "Une famille de langues",
  scopeCountryHint:
    "Touchez un pays : les sujets qu'il peut remplir se déplient.",
  scopeThemePanelHint: "Choisissez un sujet, ou jouez le pays entier.",
  scopeThemePanelNoTheme: "Jouer sans thème",
  scopeMixedHint:
    "Huit questions tirées de tout le corpus, des peuples les plus connus aux moins documentés.",
  scopeRandomHint: "Huit questions au hasard, sans ordre de difficulté.",
  leaveSession: "Quitter le quiz",
  seeScoreCard: "Voir la carte de score",
  comingSoon:
    "les questions de cette sélection arrivent — les fiches correspondantes sont en cours de vérification",
  validate: "Valider",
  questionProgressPrefix: "question",
  questionProgressSeparator: "sur",
  correctVerdict: "Bonne réponse !",
  incorrectVerdict: "Ce n'est pas ça",
  correctAnswerLabel: "Réponse : ",
  openSourceChain: "Ouvrir la chaîne de sources",
  nextQuestion: "Question suivante",
  seeScore: "Voir le score",
  loadingSession: "Chargement de la session…",
  emptySession: "Aucune question disponible sur ce sujet — réessaie plus tard.",
  backToPicker: "Choisir autre chose",
  sessionError:
    "Impossible de charger cette session — réessaie dans un instant.",
  scoreHeading: "Score",
  scoreFractionSeparator: "bonnes réponses sur",
  playAgain: "Rejouer",
  scoreCardExactAnswersSeparator: "réponses exactes sur",
  fichesEncounteredLabel: "Fiches rencontrées",
  shareScoreLabel: "Partager le score",
  copiedFeedback: "copié",
  ogSourcedLine: "chaque réponse est sourcée",
};

// @req REQ-145
export const quizCopy: Record<Language, QuizCopy> = { en, fr };
