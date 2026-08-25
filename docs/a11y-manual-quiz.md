# Passe manuelle d'accessibilité — parcours Quiz

Epic 10 (ETNI-500 · FR71, NFR20, UX-DR43) désigne la session de quiz
(`/fr/quiz`, segment → 8 questions → score) comme le parcours de référence
pour la passe manuelle d'accessibilité exécutée à chaque release. Les
vérifications automatisées (axe-core, Lighthouse) ne couvrent ni les
lecteurs d'écran réels ni le zoom navigateur ni les simulations de vision
des couleurs — cette procédure comble cet angle mort.

À exécuter par le release owner avant chaque release touchant le quiz, et à
consigner (coché/annoté) dans la pull request de release via la section
« Quiz session — passe manuelle a11y » du template de PR
(`.github/pull_request_template.md`).

## 1. VoiceOver — iOS Safari (français)

Parcourir `segment → 8 questions → score` avec VoiceOver activé, langue
VoiceOver réglée sur français :

- Le nom, le rôle et l'état de chaque contrôle (segment, option de réponse,
  bouton valider, bouton suivant/voir le score, bouton rejouer) sont
  annoncés correctement.
- Le verdict (bonne réponse / mauvaise réponse) est annoncé automatiquement
  à l'affichage de l'écran de révélation (région `aria-live`).
- Aucune interaction ne nécessite un geste que VoiceOver ne peut pas
  produire (glisser complexe, etc.).

## 2. NVDA — Windows Firefox (français)

Même parcours complet avec NVDA (langue de synthèse vocale française) sur
Firefox :

- Même vérifications que pour VoiceOver (nom/rôle/état, annonce du verdict).
- La navigation au clavier (Tab, flèches dans le groupe de radio, Entrée,
  Espace) reste cohérente avec ce que NVDA annonce.

## 3. Zoom navigateur 200 %

Avec le zoom du navigateur réglé à 200 % :

- Aucun défilement horizontal n'apparaît sur `/fr/quiz` ni pendant la
  session (sélecteur de segment, question, révélation, score).
- Aucun contenu ni contrôle n'est tronqué ou rendu inaccessible.

## 4. Simulation daltonisme — deutéranopie et protanopie

Sur les états de verdict (`QuizAnswerReveal` : bonne réponse / mauvaise
réponse) et le résumé (`QuizScoreScreen`) :

- Sous simulation deutéranopie, le sens (correct/incorrect) reste compris
  sans dépendre de la teinte seule (icône, texte, distinguable).
- Sous simulation protanopie, même vérification.

## Modèle de checklist (à copier dans la PR)

```markdown
### Quiz session — passe manuelle a11y (FR71, NFR20, UX-DR43)

- [ ] VoiceOver (iOS Safari, FR) — parcours complet segment → 8 questions → score
- [ ] NVDA (Windows Firefox, FR) — parcours complet segment → 8 questions → score
- [ ] Zoom navigateur 200 % — pas de scroll horizontal ni de contenu tronqué
- [ ] Simulation deutéranopie/protanopie sur les états de verdict — le sens ne dépend pas de la couleur seule

Notes / anomalies constatées :
```
