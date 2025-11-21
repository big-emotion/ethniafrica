# Procédure standard de recherche des ethnies par peuple

## 1. Objectif

Garantir qu’à partir de chaque peuple (PPL_xxxx) nous identifions la liste des ethnies correspondantes (ETH_xxxx) avant génération des fichiers, en s’appuyant uniquement sur des sources académiques et démographiques reconnues.

## 2. Préparation

1. Ouvrir le fichier peuple (`dataset/source/afrik/peuples/FLG_xxxx/PPL_xxxx.txt`).
2. Noter les ethnies déjà citées (section « # 1. Ethnies incluses ») ainsi que les pays/régions mentionnés.
3. Lancer les recherches web en respectant l’ordre de priorité des sources.

## 3. Sources à consulter (ordre de priorité)

1. **ONU / UNFPA / Banque Mondiale** – rapports démographiques 2020-2025.
2. **CIA World Factbook** – sections « Ethnic groups » par pays.
3. **Ethnologue (SIL)** et **Glottolog** – correspondances peuple ↔ ethnie ↔ langue.
4. **UNESCO / African Language Atlas / Atlas culturel** – classifications culturelles.
5. **Travaux académiques** : Vansina, Ehret, Hiernaux, ASCL Leiden, IWGIA, Encyclopaedia Africana, articles universitaires (Google Scholar).
6. **Sources nationales** (instituts statistiques, ministères culturels) si cohérentes avec les précédentes.

> Toute information doit être vérifiable dans au moins **deux sources distinctes**. Noter les références exactes (titre, auteur, URL, année).

## 4. Méthode de recherche par peuple

1. **Mots-clés** :
   - `"Nom du peuple" ethnies`, `"Nom du peuple" ethnic groups`, `"Nom du peuple" clans`, `"Nom du peuple" subgroups`.
   - Ajouter les principaux pays : `"Nom du peuple" + pays`.
   - Requête linguistique : `"Nom de la langue" speakers ethnies`.
2. **Extraction** :
   - Identifier les ethnies principales (niveau ETH\_) rattachées au peuple.
   - Exclure explicitement : sous-ethnies (SUB*), clans (CLN*), lignages, confédérations temporaires.
   - Consolider les variantes orthographiques (auto-appellation vs exonyme).
3. **Validation** :
   - Vérifier que chaque ethnie possède un territoire/pays identifiable.
   - Confirmer la filiation au peuple `PPL_xxxx` (critère linguistique + historique).
   - Mentionner les cas d’ethnies partagées entre plusieurs peuples (indiquer le lien croisé à vérifier plus tard).
4. **Documentation** :
   - Pour chaque ethnie retenue noter : nom principal, auto-appellation, exonymes/termes coloniaux (avec contextualisation), pays/régions majeurs, sources.

## 5. Format attendu dans `PPL_xxxx_ethnies.txt`

```
# Peuple : PPL_XYZ
- Ethnie : Nom principal
  - Auto-appellation : ...
  - Exonymes sensibles : ... (origine + pourquoi problématique)
  - Pays / régions principaux : ...
  - Sources : [Nom source 1] (URL), [Nom source 2] (URL)
```

- Classer les ethnies par ordre historique ou géographique (privilégier cohérence régionale).
- Si une information manque après recherche approfondie, indiquer `N/A` mais jamais laisser vide.

## 6. Contrôles à effectuer avant validation

- Toutes les ethnies du fichier peuple sont présentes ou expliquées (ex : fusion, correction terminologique).
- Aucun clan/sous-clan n’est listé.
- Les sources sont datées et fiables (année ≥ 2000, priorité 2015+).
- Les orthographes sont harmonisées (MAJUSCULES pour les IDs, accentuation respectée).

_Dernière mise à jour : 2025-11-17._
