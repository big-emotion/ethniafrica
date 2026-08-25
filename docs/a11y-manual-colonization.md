# Passe manuelle d'accessibilité — chronologie coloniale

Epic 13, Story 13.12 (ETNI-536 · FR87, FR89) désigne les parcours
« bascule des filtres de type » et « ouverture/fermeture de la fiche
événement » de `EventTimelineMarkers` (page
`/fr/regards/colonisation-et-resistances`) comme le périmètre de la passe
manuelle d'accessibilité exécutée à chaque release touchant le module
colonisation. Les vérifications automatisées (axe-core, Lighthouse) ne
couvrent ni les lecteurs d'écran réels ni la navigation clavier réelle —
cette procédure comble cet angle mort, à l'image de
`docs/a11y-manual-quiz.md` pour le parcours quiz.

À exécuter par le release owner avant chaque release touchant le module
colonisation, et à consigner (coché/annoté) dans la description de la pull
request de release, en copiant le modèle de checklist ci-dessous (le
template de PR par défaut n'est pas modifié par cette story — cette section
est ajoutée manuellement lorsqu'elle s'applique).

## 1. VoiceOver — iOS Safari (français)

Sur `/fr/regards/colonisation-et-resistances`, section Chronologie, langue
VoiceOver réglée sur français :

- Chaque case du groupe de filtres par type d'événement (fragmentation,
  déplacement forcé, nom imposé, résistance) est annoncée avec son nom, son
  rôle (case à cocher) et son état (coché/décoché) ; décocher un type
  retire ses marqueurs sans perdre le focus du groupe.
- Chaque marqueur d'événement est annoncé selon le gabarit
  « événement {type}, {date}, {peuple} — Entrée pour ouvrir », dans l'ordre
  chronologique du DOM.
- Activer un marqueur (Entrée) ouvre la fiche événement ; le titre de la
  fiche est annoncé à l'ouverture.
- Le bouton « Fermer » de la fiche est annoncé et ramène le focus de façon
  cohérente.
- Le slider `TimeScrubber` (à ne pas confondre avec les marqueurs) garde
  son propre contrat ARIA slider (min/max/valeur) sans régression.

## 2. NVDA — Windows Firefox (français)

Même parcours complet (bascule des filtres, ouverture/fermeture de la fiche
événement) avec NVDA (langue de synthèse vocale française) sur Firefox :

- Mêmes vérifications que pour VoiceOver (nom/rôle/état des filtres,
  gabarit d'annonce des marqueurs, ouverture/fermeture de la fiche).
- La navigation au clavier (Tab entre marqueurs et filtres, Entrée/Espace
  pour activer) reste cohérente avec ce que NVDA annonce.

## Modèle de checklist (à copier dans la PR)

```markdown
### Chronologie coloniale — passe manuelle a11y (FR87, FR89)

- [ ] VoiceOver (iOS Safari, FR) — bascule des filtres de type + ouverture/fermeture de la fiche événement
- [ ] NVDA (Windows Firefox, FR) — bascule des filtres de type + ouverture/fermeture de la fiche événement

Notes / anomalies constatées :
```
