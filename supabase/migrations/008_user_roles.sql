-- Migration 008: User Roles
-- Creates user_role enum and user_roles table for Supabase Auth role-based access

-- ============================================
-- 1. ENUM
-- ============================================

CREATE TYPE user_role AS ENUM ('reader', 'contributor', 'moderator', 'admin', 'advisor');

-- ============================================
-- 2. TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'reader',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- ============================================
-- 4. TRIGGER FOR updated_at
-- ============================================

-- Reuses existing update_updated_at_column() function from migration 001
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. RLS (Row Level Security)
-- ============================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own roles
CREATE POLICY "Users can read their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can manage all roles
CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- 6. COMMENTS
-- ============================================

COMMENT ON TABLE user_roles IS 'User roles for role-based access control with Supabase Auth';
COMMENT ON COLUMN user_roles.user_id IS 'References auth.users(id) - the authenticated user';
COMMENT ON COLUMN user_roles.role IS 'Role assigned to the user (reader, contributor, moderator, admin, advisor)';
