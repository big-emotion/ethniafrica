# Product Brief — Africa History (vision long terme)

> **Statut** : Vision long terme, pas de deadline · Auteur : jnk · Date : 2026-04-13
> _"Africa History" est le nom de travail. "EthniAfrica" est voué à changer (héritage colonial du terme "ethnie") ; "Africa History" est la piste actuelle à valider via un naming court._

---

## 1. Pourquoi ce projet existe

L'histoire des peuples africains, telle qu'elle est racontée aujourd'hui sur le web, reste largement structurée par les catégories léguées par la colonisation : exonymes imposés, classifications "ethniques" figées, frontières arbitraires, hiérarchies invisibles. Wikipédia, Britannica et la plupart des encyclopédies en ligne reproduisent cette grammaire sans la nommer.

**Africa History** propose une encyclopédie publique, gratuite, en données ouvertes, qui restitue ces histoires depuis le point de vue des peuples eux-mêmes. Pas un site académique de plus, pas un produit commercial : un **commun numérique** destiné en priorité au **public africain et à sa diaspora**, pour donner à voir ce que les manuels n'ont jamais montré.

## 2. Le triptyque éditorial

L'expérience entière s'organise autour de trois questions, qui structurent à la fois le contenu, la navigation et les modules :

- **Les noms** — qui les a donnés, ce qu'ils signifient, comment ils ont muté, ce qu'ils ont effacé
- **Les liens** — entre peuples, langues, royaumes, migrations, contacts, classifications
- **Les regards** — la part construite, contestable, contrefactuelle de toute classification, et l'empreinte coloniale dans nos catégories

Et **trois modes d'accès** déclinent ce triptyque pour différents publics et moments d'usage : **Explorer** (atlas, cartes, fiches), **Comprendre** (frises, analyses, modules narratifs), **Jouer** (quiz, comparateurs).

## 3. Audience cible

- **Public africain (continental)** — collégiens, lycéens, étudiants, curieux, enseignants
- **Diaspora africaine** — quête identitaire, transmission familiale, "héritage personnel"

Pas de cible académique en premier rang (la rigueur des sources sert la crédibilité, pas le positionnement). Pas non plus de cible "curieux occidentaux" comme priorité.

## 4. Fondations actuelles (état 2026-04)

| Élément                                                  | État                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| Données structurées AFRIK (FLG → Langue → Peuple → Pays) | ✅ 924 fiches peuples, 24 familles linguistiques, 55 pays      |
| API v2 publique (Next.js + Supabase)                     | ✅ En production, OpenAPI documentée                           |
| Page pays — design system "Carte vivante"                | ✅ Intégrée (8 sections, responsive 3 breakpoints)             |
| Migration FR-only + décolonisation routes/types          | ✅ Faite (V1 → V2)                                             |
| Qualité factuelle des fiches                             | ⚠️ Structurellement remplies, **non auditées factuellement**   |
| Cohérence référentielle                                  | ⚠️ ~10 doublons, 6 FLG mismatches, fiches erronées identifiées |

## 5. Risque #1 — La crédibilité factuelle (et la réponse : un module de vérification)

> _Africa History est un projet décolonial. Sa légitimité tient à un seul fil : la qualité de ses sources. Une seule erreur factuelle reproduite à grande échelle peut ruiner toute la posture._

### Le constat

Les 924 fiches peuples sont aujourd'hui **structurellement remplies** mais **factuellement non auditées**. L'enrichissement initial s'est appuyé sur des sources externes (Glottolog, Ethnologue, UNESCO, IWGIA, ASCL Leiden) avec un workflow IA-assisté. Cela laisse trois familles de problèmes potentiels :

- **Hallucinations factuelles** — populations inventées, dates erronées, lieux mal attribués
- **Sources fabriquées ou non vérifiables** — citations sans URL résolvable, auteurs imaginaires, ouvrages inexistants
- **Classifications discutables** présentées comme certitudes — sans la nuance critique pourtant promise par la posture décoloniale

L'audit du dataset a déjà identifié des cas concrets : `PPL_TOKELAU_FAUXEX` (peuple polynésien classé africain), 8 doublons non résolus, 6 fiches avec un `languageFamilyId` incohérent avec leur dossier parent, des codes FLG inexistants (`FLG_KWA`, `FLG_OMOTIC` au lieu de `FLG_OMOTIQUE`).

### La réponse — Module "Sources & Vérification"

Pas un module périphérique : **une fondation transversale** qui irrigue chaque fiche, chaque assertion, chaque visualisation.

**Capacités cibles :**

1. **Niveau de confiance par fiche** — chaque fiche affiche publiquement son score : nombre de sources, qualité des sources (académiques vs encyclopédiques vs IA), date de la dernière vérification humaine, signalements en cours
2. **Sources vérifiables** — chaque assertion factuelle (population, dates, lieux, classification) attachée à une source citée avec URL résolvable, page, année. Distinction visible **source primaire / source secondaire / source tertiaire**.
3. **Signalement public d'erreurs** — n'importe quel utilisateur peut contester une assertion, proposer une correction, citer une contre-source. Modération transparente.
4. **Workflow de relecture** — file d'attente publique des fiches à auditer, statut "vérifiée par contributeur scientifique" affiché clairement
5. **Audit automatisé** — détection d'incohérences (FLG ≠ dossier, doublons, populations aberrantes, codes ISO invalides, sources non résolvables) en intégration continue
6. **Doctrine éditoriale écrite et publique** — comment Africa History traite endonymes vs exonymes, classifications contestées, sujets sensibles (colonisation, races, religions)

**Pourquoi ce module est non négociable :**

- Sans lui, le projet est indistinguable d'un site de plus généré par IA
- Avec lui, il devient un **standard de référence** pour le contenu décolonial sur l'Afrique
- C'est aussi le levier le plus puissant pour attirer des **partenaires institutionnels** (UNESCO, IWGIA, universités africaines) et des **contributeurs scientifiques bénévoles**
- Il transforme une faiblesse (1 dev solo, dataset IA) en force (transparence radicale)

## 6. Vision produit — les 10 modules cibles

Le module **#0 Sources & Vérification** est transversal et conditionne tous les autres.

### Fondations (extension de l'existant V2)

1. **Page peuple** — pendant naturel de la page pays Carte vivante, exploite les 924 fiches
2. **Page famille linguistique** — valorise la hiérarchie AFRIK, arbre interactif
3. **API publique formalisée** — Swagger public, rate-limiting, clés gratuites, partenariats institutionnels

### Triptyque "Les noms"

4. **Atlas des noms** — étymologie, exonymes, endonymes, évolution historique, usages coloniaux

### Triptyque "Les liens"

5. **Liens cachés entre peuples** — graphe relationnel (linguistique, migratoire, commercial, religieux)
6. **Frise des migrations africaines** — bantoue, nilo-saharienne, couchitique, traites, caravanes
7. **Comparateur interactif** — peuples, pays, langues côte-à-côte

### Triptyque "Les regards"

8. **Colonisation & résistances** — cartographie des fragmentations, noms imposés, peuples déplacés

### Apprentissage & médiation

9. **Quiz intelligent** — apprentissage par étape, sans friction
10. **Assistant Africa History** — IA conversationnelle entraînée sur tout le dataset, capable d'expliquer, comparer, **et de signaler les incohérences** (alimente le module Vérification)

## 7. Principes non négociables

- **Gratuit** et **open data** (CC-BY-SA ou équivalent à valider)
- **Pas de monétisation** — modèle soutenu par mécénat, partenariats institutionnels, bénévolat
- **Décolonial dans le fond et dans la forme** — endonymes en priorité, exonymes contextualisés, sources critiquées
- **Mobile-first** — la grande majorité de l'audience africaine accède au web via mobile
- **Sources traçables** — chaque assertion attachée à une source vérifiable
- **Français d'abord** (extension multilingue : option future, pas un blocage)

## 8. Autres risques

| Risque                                                                                 | Impact          | Mitigation envisagée                                                             |
| -------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------- |
| **Solo dev** — vélocité limitée, bus factor de 1                                       | 🟠 Moyen        | Open source le code, attirer 1-2 contributeurs (design, data, sciences sociales) |
| **Pas de modèle de revenus**                                                           | 🟠 Moyen        | Hébergement minimal, mécénat, petits dons, partenariats institutionnels          |
| **Polémiques** sur classifications, endonymes contestés, traitement de la colonisation | 🟠 Moyen        | Doctrine éditoriale écrite, conseil scientifique léger, transparence des choix   |
| **Renommage** mal géré (perte SEO, confusion existant ↔ nouveau)                      | 🟡 Faible-moyen | Plan de rebranding propre, redirections 301, communication                       |

## 9. Métriques de succès (proposées, à valider)

Pas de KPI commerciaux. Indicateurs de mission :

- **Confiance factuelle** : % de fiches peuples avec ≥ 2 sources vérifiées et auditées humainement (cible : 80% à 2 ans)
- **Audience cible** : % du trafic provenant d'Afrique + diaspora identifiée (cible : > 60%)
- **Adoption éducative** : nombre d'enseignants / établissements citant ou utilisant le site
- **Réutilisation open data** : nombre de projets tiers consommant l'API publique
- **Partenariats institutionnels** : au moins 1 partenaire majeur signé à 18 mois (UNESCO, IWGIA, université africaine)
- **Communauté de vérification** : nombre de contributeurs actifs sur le module Sources & Vérification

## 10. Prochaines décisions à prendre (par ordre)

1. **Lancer le module Sources & Vérification** — c'est la pierre angulaire ; rien ne devrait être ajouté avant de le concevoir, même au stade MVP
2. **Auditer la qualité data existante** — cleanup doublons / fiches erronées / FLG incohérents (pré-requis avant tout module cross-fiches)
3. **Trancher le nom** — "Africa History" ou autre piste ; naming court à engager
4. **Doctrine éditoriale écrite** — endonymes, sources, traitement des sujets sensibles
5. **Roadmap des 10 modules** — séquencer par dépendance et valeur
6. **Identifier 1-2 collaborateurs cibles** — design system mobile, contributeur scientifique en sciences sociales africaines

---

_Brief généré via le skill `bmad-product-brief` — voir aussi le distillate LLM `product-brief-vision.distillate.md` pour réutilisation en input PRD._
