ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("locationLng","locationLat"),4326)) STORED;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("locationLng","locationLat"),4326)) STORED;

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("locationLng","locationLat"),4326)) STORED;

CREATE INDEX IF NOT EXISTS idx_job_location ON "Job" USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_user_location ON "User" USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_event_location ON "Event" USING GIST(location_point);
