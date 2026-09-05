/**
 * Dossier queries — the only layer that talks to afrik_dossiers.
 *
 * The table stores three discriminants and one JSONB body (migration 082), so
 * every read is a single row with no joins and no batching. That is the whole
 * reason the entity was modelled this way: a dossier is read whole or not at
 * all, and there is no listing that wants half of one.
 *
 * `content` is a passthrough, in the same sense afrik_peoples.content is. The
 * shape is fixed by public/modele-dossier.json and enforced by the parser at
 * load time, so this layer projects rather than re-validates.
 */

import { logger } from "@/lib/api/logger";
import { createServerClient } from "@/lib/supabase/server";
import type {
  DossierChapter,
  DossierGap,
  DossierSource,
  DossierThesis,
  DossierVertical,
} from "@/lib/afrik/parsers/dossierTypes";

export interface DossierContent {
  title: string;
  question: string;
  standfirst: string;
  thesis: DossierThesis;
  chapters: DossierChapter[];
  sources: DossierSource[];
  gaps: DossierGap[];
}

export interface DossierRecord {
  id: string;
  vertical: DossierVertical;
  slug: string;
  publishedOn: string;
  content: DossierContent;
}

export interface DossierSummary {
  id: string;
  vertical: DossierVertical;
  slug: string;
  publishedOn: string;
  title: string;
  question: string;
  standfirst: string;
  chapterCount: number;
  sourceCount: number;
}

interface DossierRow {
  id: string;
  vertical: DossierVertical;
  slug: string;
  published_on: string;
  content: DossierContent;
}

const SUMMARY_COLUMNS = "id, vertical, slug, published_on, content";

function toRecord(row: DossierRow): DossierRecord {
  return {
    id: row.id,
    vertical: row.vertical,
    slug: row.slug,
    publishedOn: row.published_on,
    content: row.content,
  };
}

function toSummary(row: DossierRow): DossierSummary {
  return {
    id: row.id,
    vertical: row.vertical,
    slug: row.slug,
    publishedOn: row.published_on,
    title: row.content?.title ?? "",
    question: row.content?.question ?? "",
    standfirst: row.content?.standfirst ?? "",
    chapterCount: row.content?.chapters?.length ?? 0,
    sourceCount: row.content?.sources?.length ?? 0,
  };
}

// @req REQ-114
export async function listDossierSummaries(
  vertical?: DossierVertical
): Promise<DossierSummary[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("afrik_dossiers")
    .select(SUMMARY_COLUMNS)
    .order("published_on", { ascending: false });

  if (vertical) query = query.eq("vertical", vertical);

  const { data, error } = await query;

  if (error) {
    // Logged rather than swallowed: a PostgREST error returned as an empty
    // array is indistinguishable from an empty corpus, and this repository has
    // already shipped that confusion once.
    logger.error("afrik dossier listing failed", { message: error.message });
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toSummary(row as unknown as DossierRow));
}

// @req REQ-114
export async function getDossierById(
  id: string
): Promise<DossierRecord | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_dossiers")
    .select(SUMMARY_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("afrik dossier read failed", {
      dossierId: id,
      message: error.message,
    });
    throw new Error(error.message);
  }

  return data ? toRecord(data as unknown as DossierRow) : null;
}
