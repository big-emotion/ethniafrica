import {
  listFeedRevisions,
  type FeedRevisionItem,
} from "../services/feedRevisions";
import { API_LICENSE, API_ATTRIBUTION } from "../utils/response";

export interface FeedCursorPaginationMeta {
  limit: number;
  next_cursor: string | null;
}

export interface FeedRevisionMeta {
  license: string;
  attribution: string;
  pagination: FeedCursorPaginationMeta;
}

export interface FeedRevisionEnvelope {
  data: FeedRevisionItem[];
  meta: FeedRevisionMeta;
  errors: never[];
}

export async function listFeedRevisionsHandler(
  limit: number,
  since?: string,
  cursor?: string
): Promise<FeedRevisionEnvelope> {
  const { items, next_cursor } = await listFeedRevisions(limit, since, cursor);
  return {
    data: items,
    meta: {
      license: API_LICENSE,
      attribution: API_ATTRIBUTION,
      pagination: { limit, next_cursor },
    },
    errors: [],
  };
}
