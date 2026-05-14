-- =============================================================================
-- Migration: 015_editorial_doctrine_rls_lockdown.sql
-- Story: ETNI-30 — Editorial doctrine RLS lockdown
-- =============================================================================
--
-- The editorial_doctrine table is rendered as MDX on the public site.
-- mdx_source is treated as trusted content authored by maintainers. To
-- ensure non-maintainers cannot inject arbitrary MDX/JSX, we explicitly
-- deny INSERT, UPDATE and DELETE from anon and authenticated roles.
--
-- service_role bypasses RLS, so seed migrations and admin tooling
-- continue to work as before.
-- =============================================================================

ALTER TABLE editorial_doctrine ENABLE ROW LEVEL SECURITY;

-- Remove any prior write policies if they exist (idempotent).
DROP POLICY IF EXISTS editorial_doctrine_no_insert_anon ON editorial_doctrine;
DROP POLICY IF EXISTS editorial_doctrine_no_update_anon ON editorial_doctrine;
DROP POLICY IF EXISTS editorial_doctrine_no_delete_anon ON editorial_doctrine;

-- Explicit deny for anon + authenticated. WITH CHECK (false) / USING (false)
-- guarantees no row ever passes the policy check.
CREATE POLICY editorial_doctrine_no_insert_anon ON editorial_doctrine
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY editorial_doctrine_no_update_anon ON editorial_doctrine
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY editorial_doctrine_no_delete_anon ON editorial_doctrine
  FOR DELETE
  TO anon, authenticated
  USING (false);

COMMENT ON POLICY editorial_doctrine_no_insert_anon ON editorial_doctrine IS
  'Explicit deny: only service_role may insert editorial doctrine entries.';
COMMENT ON POLICY editorial_doctrine_no_update_anon ON editorial_doctrine IS
  'Explicit deny: only service_role may update editorial doctrine entries.';
COMMENT ON POLICY editorial_doctrine_no_delete_anon ON editorial_doctrine IS
  'Explicit deny: only service_role may delete editorial doctrine entries.';
