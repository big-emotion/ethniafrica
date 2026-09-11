---
name: ethniafrica-idee
description: Brainstormer un sujet de publication EthniAfrica et en sortir un rapport de sujet — angle, pilier, promesse en une phrase, ce que le sujet ne dira pas, sources pressenties, formats visés, réserves. Première étape de la chaîne idee → structure → produire. Utiliser pour « j'ai une idée de… », « on pourrait parler de… », « trouve-moi un sujet », « qu'est-ce qu'on pourrait publier sur… », ou /ethniafrica-idee. N'écrit aucune carte, ne choisit aucune image, ne touche à aucun gabarit.
---

# idee — brainstormer un sujet

Première étape. Rien ne vient avant. `structure` vient après.

Tu produis **un rapport de sujet**, pas un contenu. Un rapport de sujet est le
document qui permet à une session `structure` d'écrire les cartes sans te
reposer une question.

## Entrée

Une intuition, un thème, une actualité — ou rien. Sans entrée, propose depuis le
corpus : lis `etat-du-pipeline.md`, qui vit dans la bibliothèque de production,
pour ne pas reproposer un sujet déjà en cours, puis cherche dans le corpus ce qui
est richement documenté et jamais publié.

## Sortie

Un fichier unique : `$ETHNIAFRICA_SOCIAL_OUTPUT/_idees/{slug}.md`.

```markdown
# {titre de travail}

Écrit le {AAAA-MM-JJ}.

|               |                               |
| ------------- | ----------------------------- |
| Pilier        | {un seul}                     |
| Formats visés | {carrousel · reel · les deux} |

## L'angle

Une phrase. Ce que ce sujet dit que personne ne dit ailleurs.

## La promesse

Une phrase, au futur du lecteur : ce qu'il saura après.

## Ce que le sujet ne dira pas

La liste des choses que le corpus ne permet pas d'affirmer. C'est la section
la plus importante du rapport : elle empêche `structure` d'écrire une phrase
que les sources ne portent pas.

## Sources pressenties

Une ligne par source, avec son tier et pourquoi on pense qu'elle tient.
Aucune licence n'est vérifiée à cette étape — c'est le travail de `structure`.

## Réserves

Ce qui pourrait faire échouer le sujet.
```

## Les règles

- **Un sujet, un pilier, un angle.** Deux angles sont deux sujets.
- **Une accroche dont le corpus ne peut pas payer la dette n'est pas une
  accroche, c'est un appât.** Sur un atlas sourcé c'est aussi un mensonge sur le
  corpus. Si la promesse n'est pas tenable, le rapport le dit et le sujet meurt
  ici, où il ne coûte rien.
- **La rhétorique reste étiquetée rhétorique.** Une phrase d'emphase éditoriale
  ne devient jamais un constat historique en descendant la chaîne.
- **N'invente ni une source, ni une licence, ni un chiffre.** Un chiffre non
  vérifié se note comme non vérifié.

## Ce que tu ne fais pas

Écrire les cartes. Choisir les images. Ouvrir un gabarit. Rendre quoi que ce soit.
Créer un dossier dans `02-Reseaux-sociaux/`.

## Pour finir

Recalcule l'état : `node social/tools/etat-pipeline/build-etat.mjs`.

Puis dis à l'opérateur, en une ligne, que le sujet est en ⚪️ Brouillon et que
l'étape suivante est `structure`. Ne la lance pas de toi-même.
