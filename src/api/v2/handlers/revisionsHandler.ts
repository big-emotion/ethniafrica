import {
  listPeopleRevisions,
  getPeopleRevisionSnapshot,
  type PeopleRevisionListItem,
} from "../services/revisions";
import {
  createApiResponse,
  API_LICENSE,
  API_ATTRIBUTION,
  type ApiEnvelope,
} from "../utils/response";

export interface CursorPaginationMeta {
  limit: number;
  next_cursor: number | null;
}

export interface RevisionListMeta {
  license: string;
  attribution: string;
  pagination: CursorPaginationMeta;
}

export interface RevisionListEnvelope {
  data: PeopleRevisionListItem[];
  meta: RevisionListMeta;
  errors: never[];
}

export async function listPeopleRevisionsHandler(
  entityId: string,
  limit: number,
  cursor?: number
): Promise<RevisionListEnvelope> {
  const { items, next_cursor } = await listPeopleRevisions(
    entityId,
    limit,
    cursor
  );
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

export async function getPeopleRevisionSnapshotHandler(
  entityId: string,
  version: number
): Promise<ApiEnvelope<Record<string, unknown>> | null> {
  const snapshot = await getPeopleRevisionSnapshot(entityId, version);
  if (!snapshot) return null;
  return createApiResponse(snapshot.data, {
    confidence: snapshot.confidence,
    pinnedUrl: `/api/v2/peoples/${entityId}/versions/${snapshot.version}`,
  });
}
