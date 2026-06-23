import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const skills = [
  // ─── Event ─────────────────────────────────────────────────────────────────
  { name: 'Promoter',          slug: 'promoter',          category: 'event' },
  { name: 'Hostess',           slug: 'hostess',           category: 'event' },
  { name: 'Event Helper',      slug: 'event-helper',      category: 'event' },
  { name: 'Event Coordinator', slug: 'event-coordinator', category: 'event' },
  { name: 'Brand Ambassador',  slug: 'brand-ambassador',  category: 'event' },
  { name: 'MC / Anchor',       slug: 'mc-anchor',         category: 'event' },

  // ─── Media ─────────────────────────────────────────────────────────────────
  { name: 'Photographer',  slug: 'photographer',  category: 'media' },
  { name: 'Videographer',  slug: 'videographer',  category: 'media' },
  { name: 'Photo Editor',  slug: 'photo-editor',  category: 'media' },

  // ─── Logistics ─────────────────────────────────────────────────────────────
  { name: 'Logistics Support',   slug: 'logistics-support',   category: 'logistics' },
  { name: 'Warehouse Assistant', slug: 'warehouse-assistant', category: 'logistics' },
  { name: 'Driver',              slug: 'driver',              category: 'logistics' },
];

async function main() {
  console.log(`Seeding ${skills.length} skills...`);

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {},
      create: skill,
    });
  }

  console.log(`✅ Seeded ${skills.length} skills successfully`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
