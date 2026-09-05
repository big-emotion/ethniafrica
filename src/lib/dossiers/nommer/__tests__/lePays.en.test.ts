import { CHAPITRE_LE_PAYS } from "@/lib/dossiers/nommer/chapters/lePays";
import { CHAPITRE_LE_PAYS_EN } from "@/lib/dossiers/nommer/chapters/lePays.en";

import { describeChapterParity } from "./chapterParity";

// @req REQ-145
describeChapterParity(CHAPITRE_LE_PAYS, CHAPITRE_LE_PAYS_EN);
