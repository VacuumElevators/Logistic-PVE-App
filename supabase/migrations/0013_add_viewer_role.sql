-- Add a read-only VIEWER role to the UserRole enum.
-- Additive only: existing users/rows are unaffected. VIEWER grants read access
-- across the portal with no create/edit/approve capabilities (see permissions.ts).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VIEWER';
