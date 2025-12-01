# WORKFLOW_AFRIK_STATUS.md

# Version 2.0 — Suivi de progression du Workflow AFRIK (Simplifié)

# Ce fichier sert de tableau de bord. Coche au fur et à mesure.

---

## 0. ÉTAT GLOBAL DU PROJET

- [x] Familles linguistiques (24/24)
- [x] Langues principales
- [x] Peuples (681+ fiches synchronisées avec peuples réels - 53 pays traités)
- [x] Pays (55/55)
- [ ] CSV démographies
- [ ] Validation globale
- [ ] Publication

**Terminé :** Synchronisation peuples réels vs documentés (53 pays traités dans l'ordre croissant, du moins au plus nombreux)

**Note :** Le projet a été simplifié pour se concentrer uniquement sur familles linguistiques, langues, peuples et pays. Les données ethnies/sous-ethnies/clans ont été déplacées dans `/dataset/source/archive/`.

---

# 1. ÉTAPE 1 — FAMILLES LINGUISTIQUES (COMPLET — 24/24)

## Macro-familles (racines)

- [x] FLG_AFROASIATIQUE — Afro-asiatique
- [x] FLG_NIGERCONGO — Niger-Congo
- [x] FLG_NILOSAHARIENNE — Nilo-saharienne
- [x] FLG_KHOISAN — Khoïsan (macro-étiquette)

## Sous-familles détaillées (24/24)

### Afro-asiatique

- [x] FLG_SEMITIQUE — Sémitique
- [x] FLG_BERBERE — Berbère / Amazigh
- [x] FLG_TCHADIQUE — Tchadique
- [x] FLG_COUCHITIQUE — Couchitique
- [x] FLG_OMOTIQUE — Omotique

### Niger-Congo

- [x] FLG_ATLANTIQUE — Atlantique
- [x] FLG_MANDE — Mandé
- [x] FLG_GUR — Gur
- [x] FLG_KROU — Krou
- [x] FLG_BENOUECONGO — Bénoué-Congo
- [x] FLG_BANTU — Bantou

### Nilo-saharien

- [x] FLG_NILOTIQUE — Nilotique
- [x] FLG_SOUDANIQUECENTRAL — Soudanique central
- [x] FLG_SAHARIEN — Saharien
- [x] FLG_SONGHAY — Songhay

### Khoïsan (familles réelles)

- [x] FLG_KHOE — Khoe
- [x] FLG_KXA — Kx’a
- [x] FLG_TUU — Tuu

### Autres familles présentes en Afrique

- [x] FLG_AUSTRONESIENNE — Austronésienne (Madagascar)
- [x] FLG_CREOLE — Créoles africains

## CSV

- [x] famille_linguistique.csv complété (données démographiques 2025)

---

# 2. ÉTAPE 2 — LANGUES (principales)

- [x] Swahili (swa)
- [x] Lingala (lin)
- [x] Kinyarwanda (kin)
- [x] Kirundi (run)
- [x] Wolof (wol)
- [x] Yoruba (yor)
- [x] Igbo (ibo)
- [x] Fula/Fulfulde (ful)
- [x] Hausa (hau)
- [x] Somali (som)
- [x] Amharique (amh)
- [x] Tigrinya (tir)
- [x] Arabe maghrébin (ary)
- [x] Tamazight (ber)
- [x] Zoulou (zul)
- [x] Xhosa (xho)
- [x] Shona (sna)
- [x] Tswana (tsn)
- [x] Ndebele (nde)
- [x] Ewé (ewe)
- [x] Fang (fan)
- [x] Sango (sag)

CSV :

- [x] famille_linguistique.csv enrichi

---

# 3. ÉTAPE 3 — PEUPLES (COMPLET — 592/592)

- [x] PPL_KONGO
- [x] PPL_BETI_FANG
- [x] PPL_BAMILÉKÉ
- [x] PPL_MANDINGUE
- [x] PPL_FULANI
- [x] PPL_YORUBA
- [x] PPL_IGBO
- [x] PPL_ZULU
- [x] PPL_SHONA
- [x] PPL_TUAREG
- [x] PPL_AMAZIGH
- [x] PPL_NILOTIC
- [x] PPL_COUCHITIC
- [x] PPL_SWAHILI
- [x] PPL_SAN
- [x] PPL_KHOÏKHOÏ
- [x] ... et 576 autres peuples (592 au total)

**Tous les peuples ont été générés selon le modèle modele-peuple.txt**

**Note :** Après nettoyage des déclinaisons (\_RURAL, \_URBAIN, \_DIASPORA, \_GLOBAL), il reste 592 peuples principaux.

CSV :

- [ ] peuple_demographie_globale.csv rempli (302 entrées sur 592 peuples)

---

# 4. ÉTAPE 4 — PAYS (55 pays)

- [x] Algérie
- [x] Angola
- [x] Afrique du Sud
- [x] Bénin
- [x] Botswana
- [x] Burkina Faso
- [x] Burundi
- [x] Cameroun
- [x] Cap-Vert
- [x] Comores
- [x] Côte d'Ivoire
- [x] Djibouti
- [x] Égypte
- [x] Érythrée
- [x] Eswatini
- [x] Éthiopie
- [x] Gabon
- [x] Gambie
- [x] Ghana
- [x] Guinée
- [x] Guinée-Bissau
- [x] Guinée équatoriale
- [x] Kenya
- [x] Lesotho
- [x] Libéria
- [x] Libye
- [x] Madagascar
- [x] Malawi
- [x] Mali
- [x] Maroc
- [x] Maurice
- [x] Mauritanie
- [x] Mozambique
- [x] Namibie
- [x] Niger
- [x] Nigeria
- [x] Ouganda
- [x] RCA
- [x] RDC
- [x] Rwanda
- [x] Sao Tomé-et-Principe
- [x] Sénégal
- [x] Seychelles
- [x] Sierra Leone
- [x] Somalie
- [x] Soudan
- [x] Soudan du Sud
- [x] Tanzanie
- [x] Tchad
- [x] Togo
- [x] Tunisie
- [x] Zambie
- [x] Zimbabwe

CSV :

- [ ] pays_demographie.csv rempli

---

# 5. ÉTAPE 5 — DÉMOGRAPHIE (COHÉRENCE 100%)

- [ ] Somme peuples = 100 % (par pays)
- [ ] Peuples = population totale (tous pays)
- [ ] Familles linguistiques = somme locuteurs
- [ ] Réconciliation sources (ONU / CIA / SIL)
- [ ] Vérification année référence (2025)

---

# 6. ÉTAPE 6 — VALIDATION

- [ ] IDs cohérents
- [ ] Langue → famille linguistique OK
- [ ] Peuple → pays OK
- [ ] Termes coloniaux contextualisés
- [ ] Sections TXT complètes
- [ ] Origines et appellations (exonymes/endonymes) enrichies

---

# 7. ÉTAPE 7 — PUBLICATION

- [ ] Upload TXT
- [ ] Upload CSV
- [ ] Release GitHub
- [ ] Notes de version

---

# NOTES IMPORTANTES

**Données archivées :**

- Les fichiers ethnies (1716 fichiers ETH\_\*.txt) ont été déplacés dans `/dataset/source/archive/ethnies/`
- Les fichiers sous-ethnies (36 fichiers SUB\_\*.txt) ont été déplacés dans `/dataset/source/archive/sous_ethnies/`
- Les fichiers clans (8 fichiers CLN\_\*.txt) ont été déplacés dans `/dataset/source/archive/clans/`
- Les fichiers ambigus (4 fichiers) ont été déplacés dans `/dataset/source/archive/ambigus/`

**Focus du projet :**
Le projet se concentre désormais sur l'enrichissement qualitatif des familles linguistiques, langues, peuples et pays, avec un accent particulier sur :

- Les origines et migrations
- Les appellations (exonymes et endonymes)
- La contextualisation des termes coloniaux
