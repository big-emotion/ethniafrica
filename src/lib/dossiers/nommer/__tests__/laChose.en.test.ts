import { CHAPITRE_LA_CHOSE } from "@/lib/dossiers/nommer/chapters/laChose";
import { CHAPITRE_LA_CHOSE_EN } from "@/lib/dossiers/nommer/chapters/laChose.en";

import { describeChapterParity } from "./chapterParity";

// @req REQ-145
describeChapterParity(CHAPITRE_LA_CHOSE, CHAPITRE_LA_CHOSE_EN);
