-- rls-exempt: schema-only changes; ElevatorConfiguration RLS posture inherited from 0008 (read_all + manager_write) covers new columns automatically.
-- Phase 3: per-stop config, ElevatorEngine + ElevatorKind enums. Drops legacy orientation column + enum (cfg_count=0 verified pre-flight).

CREATE TYPE "ElevatorEngine" AS ENUM ('NONE', 'SPLIT', 'HEAD_UNIT');
CREATE TYPE "ElevatorKind" AS ENUM ('CYLINDER', 'CUBE');

ALTER TABLE "ElevatorConfiguration"
  ADD COLUMN "engine" "ElevatorEngine" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "elevatorKind" "ElevatorKind" NOT NULL DEFAULT 'CYLINDER',
  ADD COLUMN "stopsConfig" JSONB,
  DROP COLUMN "orientation";

DROP TYPE "CylinderOrientation";
