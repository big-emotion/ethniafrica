-- Migration 050 — search_query_log
--
-- Context: ETNI-1419 / REQ-002 ("Alternate spellings are not found"). A
-- reader typing a name search doesn't find isn't a bug report — it's silent.
-- Without a log there is no way to know which alternate spellings or missing
-- terms to prioritize. This table is pure telemetry: query text, its result
-- count, and when it ran. No reader identifier, no IP, no user agent.
--
-- RLS on with no policy, same posture as antibot_challenges (048): the table
-- is reachable only through the service-role client.

CREATE TABLE IF NOT EXISTS search_query_log (
  id            BIGSERIAL PRIMARY KEY,
  query         TEXT NOT NULL,
  result_count  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE search_query_log IS
  'One row per executed search: query text, result count and timestamp. No reader identifier or personal data (ETNI-1419, REQ-002).';

CREATE INDEX IF NOT EXISTS idx_search_query_log_created_at
  ON search_query_log (created_at);

ALTER TABLE search_query_log ENABLE ROW LEVEL SECURITY;
