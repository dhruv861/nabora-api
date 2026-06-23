# PostGIS Generated Columns — Migration Notes

## Why `location_point` is absent from `schema.prisma`

Prisma does not support `GENERATED ALWAYS AS ... STORED` computed columns.
Declaring them in `schema.prisma` is not possible with any current Prisma version.

## What was done instead

After `prisma migrate dev --name init` generated the base migration SQL,
the following raw SQL was **appended** to the generated migration file:

```sql
-- Add PostGIS generated column to users
ALTER TABLE "users"
ADD COLUMN location_point GEOGRAPHY(Point, 4326)
GENERATED ALWAYS AS (
  CASE
    WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography
    ELSE NULL
  END
) STORED;

-- Add PostGIS generated column to jobs
ALTER TABLE "jobs"
ADD COLUMN location_point GEOGRAPHY(Point, 4326)
GENERATED ALWAYS AS (
  ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography
) STORED;

-- Add PostGIS generated column to events
ALTER TABLE "events"
ADD COLUMN location_point GEOGRAPHY(Point, 4326)
GENERATED ALWAYS AS (
  ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography
) STORED;

-- GIST indexes (critical for PostGIS performance — do not skip)
CREATE INDEX users_location_gist  ON "users"  USING GIST(location_point);
CREATE INDEX jobs_location_gist   ON "jobs"   USING GIST(location_point);
CREATE INDEX events_location_gist ON "events" USING GIST(location_point);

-- Admin partial index
CREATE INDEX users_admin_idx ON "users"(is_admin) WHERE is_admin = TRUE;
```

## Why this approach

- The SQL is part of the **init migration file**, so `prisma migrate deploy`
  in production runs it automatically — no separate migration script needed.
- PostGIS `STORED` columns enable GIST indexing (not possible on VIRTUAL columns).
- The application writes `location_lat` and `location_lng` as plain floats.
  PostgreSQL computes `location_point` automatically from those values.
- All PostGIS queries use `$queryRaw` and reference `location_point` directly.
  Prisma's generated TypeScript types will not include `location_point` — that is expected.

## For future developers

**DO NOT add `location_point` to `schema.prisma`.** Prisma will attempt to drop
and recreate the column on the next `prisma migrate dev`, which will fail because
generated columns cannot be dropped and recreated in a standard `ALTER TABLE`.

If you need to modify the generated column definition, create a new manual migration
that drops and recreates the column using the `--create-only` flag:
```bash
npx prisma migrate dev --name update_location_point --create-only
# Then manually edit the generated migration.sql
```
