import { CHAPITRE_LA_PERSONNE } from "@/lib/dossiers/nommer/chapters/laPersonne";
import { CHAPITRE_LA_PERSONNE_EN } from "@/lib/dossiers/nommer/chapters/laPersonne.en";

import { describeChapterParity } from "./chapterParity";

// @req REQ-145
describeChapterParity(CHAPITRE_LA_PERSONNE, CHAPITRE_LA_PERSONNE_EN);
