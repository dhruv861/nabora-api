const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Check _prisma_migrations table
  const migrations = await prisma.$queryRawUnsafe(
    `SELECT migration_name, applied_steps_count FROM _prisma_migrations`
  );
  console.log('\n✅ Migration history:');
  console.table(migrations);

  // 2. Verify location_point columns exist (PostGIS generated columns)
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('User', 'Job', 'Event')
      AND column_name = 'location_point'
    ORDER BY table_name
  `);
  console.log('\n✅ PostGIS geography columns:');
  console.table(cols);

  // 3. Verify GIST indexes
  const indexes = await prisma.$queryRawUnsafe(`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE tablename IN ('User', 'Job', 'Event')
      AND (indexname LIKE '%gist%' OR indexname LIKE '%isAdmin%' OR indexname LIKE '%citySlug_status%' OR indexname LIKE '%isFeatured_status%')
    ORDER BY tablename, indexname
  `);
  console.log('\n✅ PostGIS + composite indexes:');
  console.table(indexes);

  // 4. Count all tables
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log(`\n✅ Total tables in DB: ${tables.length}`);
  console.table(tables);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
