import { CHAPITRE_LA_LANGUE } from "@/lib/dossiers/nommer/chapters/laLangue";
import { CHAPITRE_LA_LANGUE_EN } from "@/lib/dossiers/nommer/chapters/laLangue.en";

import { describeChapterParity } from "./chapterParity";

// @req REQ-145
describeChapterParity(CHAPITRE_LA_LANGUE, CHAPITRE_LA_LANGUE_EN);
