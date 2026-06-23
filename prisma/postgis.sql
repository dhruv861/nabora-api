-- PostGIS generated columns + GIST indexes
-- Applied separately because db push doesn't run GENERATED ALWAYS AS STORED columns

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "location_point" geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN "locationLat" IS NOT NULL AND "locationLng" IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint("locationLng", "locationLat"), 4326)::geography
    END
  ) STORED;

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "location_point" geography(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint("locationLng", "locationLat"), 4326)::geography
  ) STORED;

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "location_point" geography(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint("locationLng", "locationLat"), 4326)::geography
  ) STORED;

CREATE INDEX IF NOT EXISTS "User_location_point_gist"
  ON "User" USING GIST ("location_point");

CREATE INDEX IF NOT EXISTS "Job_location_point_gist"
  ON "Job" USING GIST ("location_point");

CREATE INDEX IF NOT EXISTS "Event_location_point_gist"
  ON "Event" USING GIST ("location_point");

CREATE INDEX IF NOT EXISTS "User_isAdmin_partial_idx"
  ON "User" ("isAdmin")
  WHERE "isAdmin" = true;

CREATE INDEX IF NOT EXISTS "Job_citySlug_status_workDate_idx"
  ON "Job" ("citySlug", "status", "workDate");

CREATE INDEX IF NOT EXISTS "User_citySlug_availability_idx"
  ON "User" ("citySlug", "availabilityStatus")
  WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "Job_isFeatured_status_idx"
  ON "Job" ("isFeatured", "status")
  WHERE "isFeatured" = true;
