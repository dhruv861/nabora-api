/**
 * Nabora — Full Demo Seed
 * ========================
 * Populates every table with realistic, logically consistent data so that
 * every frontend page has something to show.
 *
 * Persona map (phones to use for login):
 *   Admin / Employer  : 9000000001  (Vikram Shah — EventCo OWNER, isAdmin)
 *   Employer 2        : 9000000002  (Priya Desai — EventCo OPS_MGR)
 *   Worker 1          : 9000000003  (Rahul Mehta — photographer, SILVER)
 *   Worker 2          : 9000000004  (Anjali Singh — promoter, BRONZE)
 *   Worker 3          : 9000000005  (Dev Patel   — event-helper)
 *   Worker 4          : 9000000006  (Meera Joshi  — videographer)
 *   Field Coordinator : 9000000007  (Arjun Nair  — EventCo FIELD_COORDINATOR)
 *
 * Run:  npm run seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

const d = (offsetDays: number, h = 10, m = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(h, m, 0, 0);
  return dt;
};

const todayMidnight = (offsetDays = 0) => {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
};

function slug(text: string, suffix: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + suffix;
}

// Ahmedabad coordinates (city centre + slight jitter per venue)
const AMD = { lat: 23.0225, lng: 72.5714 };

// ─── skills (same as before — idempotent) ───────────────────────────────────

const SKILLS = [
  { name: 'Promoter',          slug: 'promoter',          category: 'event' },
  { name: 'Hostess',           slug: 'hostess',           category: 'event' },
  { name: 'Event Helper',      slug: 'event-helper',      category: 'event' },
  { name: 'Event Coordinator', slug: 'event-coordinator', category: 'event' },
  { name: 'Brand Ambassador',  slug: 'brand-ambassador',  category: 'event' },
  { name: 'MC / Anchor',       slug: 'mc-anchor',         category: 'event' },
  { name: 'Photographer',      slug: 'photographer',      category: 'media' },
  { name: 'Videographer',      slug: 'videographer',      category: 'media' },
  { name: 'Photo Editor',      slug: 'photo-editor',      category: 'media' },
  { name: 'Logistics Support', slug: 'logistics-support', category: 'logistics' },
  { name: 'Warehouse Assistant', slug: 'warehouse-assistant', category: 'logistics' },
  { name: 'Driver',            slug: 'driver',            category: 'logistics' },
];

async function main() {
  console.log('\n🌱 Starting Nabora demo seed...\n');

  // ── 1. SKILLS ─────────────────────────────────────────────────────────────
  console.log('1/14  Skills...');
  const skillMap: Record<string, string> = {};
  for (const s of SKILLS) {
    const skill = await prisma.skill.upsert({
      where: { slug: s.slug }, update: {}, create: s,
    });
    skillMap[s.slug] = skill.id;
  }

  // ── 2. USERS ──────────────────────────────────────────────────────────────
  console.log('2/14  Users...');

  const vikram = await prisma.user.upsert({
    where: { phone: '9000000001' }, update: {},
    create: {
      phone: '9000000001', name: 'Vikram Shah', email: 'vikram@eventco.in',
      bio: 'Co-founder of EventCo Ahmedabad. Running BTL activations since 2018.',
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
      accountType: 'ORGANIZATION', verificationLevel: 'GOLD',
      isAdmin: true, isNewWorker: false,
      completedJobCount: 45, reliabilityScore: 94.5, averageRating: 4.8, ratingCount: 12,
      locationLat: AMD.lat, locationLng: AMD.lng,
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'SG Highway',
    },
  });

  const priya = await prisma.user.upsert({
    where: { phone: '9000000002' }, update: {},
    create: {
      phone: '9000000002', name: 'Priya Desai', email: 'priya@eventco.in',
      bio: 'Operations manager at EventCo. Handles 30+ events per quarter.',
      avatarUrl: 'https://i.pravatar.cc/150?img=23',
      accountType: 'ORGANIZATION', verificationLevel: 'SILVER',
      isNewWorker: false, completedJobCount: 28, reliabilityScore: 90.0,
      averageRating: 4.6, ratingCount: 8,
      locationLat: AMD.lat + 0.005, locationLng: AMD.lng + 0.005,
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Navrangpura',
    },
  });

  const rahul = await prisma.user.upsert({
    where: { phone: '9000000003' }, update: {},
    create: {
      phone: '9000000003', name: 'Rahul Mehta', email: 'rahul.mehta@gmail.com',
      bio: 'Freelance photographer with 4 years of event & corporate photography experience.',
      avatarUrl: 'https://i.pravatar.cc/150?img=3',
      accountType: 'PERSONAL', verificationLevel: 'SILVER',
      availabilityStatus: 'AVAILABLE_NOW', isNewWorker: false,
      completedJobCount: 22, reliabilityScore: 88.0, averageRating: 4.7, ratingCount: 9,
      locationLat: AMD.lat + 0.01, locationLng: AMD.lng - 0.008,
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Vastrapur',
      panNumber: 'ABCPM1234R', upiId: 'rahul.mehta@upi',
    },
  });

  const anjali = await prisma.user.upsert({
    where: { phone: '9000000004' }, update: {},
    create: {
      phone: '9000000004', name: 'Anjali Singh', email: 'anjali.singh@gmail.com',
      bio: 'Energetic brand promoter. Worked with Unilever, HUL, and Pepsi activations.',
      avatarUrl: 'https://i.pravatar.cc/150?img=45',
      accountType: 'PERSONAL', verificationLevel: 'BRONZE',
      availabilityStatus: 'AVAILABLE_NOW', isNewWorker: false,
      completedJobCount: 14, reliabilityScore: 82.0, averageRating: 4.3, ratingCount: 6,
      locationLat: AMD.lat - 0.006, locationLng: AMD.lng + 0.01,
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Bodakdev',
      upiId: 'anjali.singh@upi',
    },
  });

  const dev = await prisma.user.upsert({
    where: { phone: '9000000005' }, update: {},
    create: {
      phone: '9000000005', name: 'Dev Patel',
      bio: 'Quick and reliable event helper. Available on short notice.',
      avatarUrl: 'https://i.pravatar.cc/150?img=7',
      accountType: 'PERSONAL', verificationLevel: 'NONE',
      availabilityStatus: 'AVAILABLE_THIS_WEEK', isNewWorker: true,
      completedJobCount: 0, reliabilityScore: 0, averageRating: 0, ratingCount: 0,
      locationLat: AMD.lat + 0.015, locationLng: AMD.lng + 0.002,
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Satellite',
    },
  });

  const meera = await prisma.user.upsert({
    where: { phone: '9000000006' }, update: {},
    create: {
      phone: '9000000006', name: 'Meera Joshi', email: 'meera.joshi@gmail.com',
      bio: 'Videographer with expertise in corporate films, reels, and live event coverage.',
      avatarUrl: 'https://i.pravatar.cc/150?img=32',
      accountType: 'PERSONAL', verificationLevel: 'BRONZE',
      availabilityStatus: 'AVAILABLE_NOW', isNewWorker: false,
      completedJobCount: 11, reliabilityScore: 79.0, averageRating: 4.4, ratingCount: 5,
      locationLat: AMD.lat + 0.003, locationLng: AMD.lng - 0.012,
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Prahladnagar',
      upiId: 'meera.joshi@upi',
    },
  });

  const arjun = await prisma.user.upsert({
    where: { phone: '9000000007' }, update: {},
    create: {
      phone: '9000000007', name: 'Arjun Nair',
      bio: 'Field coordinator with ground-level event management experience across Gujarat.',
      avatarUrl: 'https://i.pravatar.cc/150?img=60',
      accountType: 'PERSONAL', verificationLevel: 'NONE',
      availabilityStatus: 'AVAILABLE_NOW', isNewWorker: false,
      completedJobCount: 8, reliabilityScore: 75.0,
      locationLat: AMD.lat - 0.009, locationLng: AMD.lng - 0.003,
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'CG Road',
    },
  });

  // ── 3. WORKER PROFILES ────────────────────────────────────────────────────
  console.log('3/14  Worker profiles...');

  const rahulWP = await prisma.workerProfile.upsert({
    where: { userId: rahul.id }, update: {},
    create: {
      userId: rahul.id, headline: 'Professional Event Photographer',
      categorySlug: 'photographer', yearsExp: 4,
      slug: 'rahul-mehta-photographer-ahmedabad',
      skills: {
        create: [
          { skillId: skillMap['photographer'], yearsExp: 4 },
          { skillId: skillMap['videographer'], yearsExp: 1 },
          { skillId: skillMap['photo-editor'], yearsExp: 3 },
        ],
      },
      portfolioItems: {
        create: [
          { title: 'Corporate Launch Event', imageUrl: 'https://picsum.photos/seed/rahul1/400/300', sortOrder: 1 },
          { title: 'Wedding Reception Coverage', imageUrl: 'https://picsum.photos/seed/rahul2/400/300', sortOrder: 2 },
          { title: 'Product Activation Campaign', imageUrl: 'https://picsum.photos/seed/rahul3/400/300', sortOrder: 3 },
        ],
      },
    },
  });

  const anjaliWP = await prisma.workerProfile.upsert({
    where: { userId: anjali.id }, update: {},
    create: {
      userId: anjali.id, headline: 'Brand Promoter & Hostess',
      categorySlug: 'promoter', yearsExp: 2,
      slug: 'anjali-singh-promoter-ahmedabad',
      skills: {
        create: [
          { skillId: skillMap['promoter'], yearsExp: 2 },
          { skillId: skillMap['brand-ambassador'], yearsExp: 1 },
          { skillId: skillMap['hostess'], yearsExp: 2 },
        ],
      },
      portfolioItems: {
        create: [
          { title: 'Pepsi Road Show Ahmedabad', imageUrl: 'https://picsum.photos/seed/anjali1/400/300', sortOrder: 1 },
          { title: 'HUL Mall Activation', imageUrl: 'https://picsum.photos/seed/anjali2/400/300', sortOrder: 2 },
        ],
      },
    },
  });

  const devWP = await prisma.workerProfile.upsert({
    where: { userId: dev.id }, update: {},
    create: {
      userId: dev.id, headline: 'Versatile Event Helper',
      categorySlug: 'event-helper', yearsExp: 0,
      slug: 'dev-patel-event-helper-ahmedabad',
      skills: { create: [{ skillId: skillMap['event-helper'], yearsExp: 0 }] },
    },
  });

  const meeraWP = await prisma.workerProfile.upsert({
    where: { userId: meera.id }, update: {},
    create: {
      userId: meera.id, headline: 'Corporate & Event Videographer',
      categorySlug: 'videographer', yearsExp: 3,
      slug: 'meera-joshi-videographer-ahmedabad',
      skills: {
        create: [
          { skillId: skillMap['videographer'], yearsExp: 3 },
          { skillId: skillMap['photo-editor'], yearsExp: 2 },
        ],
      },
      portfolioItems: {
        create: [
          { title: 'Brand Summit 2024 Reel', imageUrl: 'https://picsum.photos/seed/meera1/400/300', sortOrder: 1 },
        ],
      },
    },
  });

  const arjunWP = await prisma.workerProfile.upsert({
    where: { userId: arjun.id }, update: {},
    create: {
      userId: arjun.id, headline: 'Field Coordinator',
      categorySlug: 'event-coordinator', yearsExp: 3,
      slug: 'arjun-nair-coordinator-ahmedabad',
      skills: { create: [{ skillId: skillMap['event-coordinator'], yearsExp: 3 }] },
    },
  });

  // ── 4. ORGANIZATION ───────────────────────────────────────────────────────
  console.log('4/14  Organization...');

  const org = await prisma.organization.upsert({
    where: { slug: 'eventco-ahmedabad-orgev1co' },
    update: {},
    create: {
      name: 'EventCo Ahmedabad',
      slug: 'eventco-ahmedabad-orgev1co',
      description: '[Event Management] Premier BTL activation and event management company based in Ahmedabad.',
      city: 'Ahmedabad', citySlug: 'ahmedabad',
      address: 'B-404, Titanium City Centre, SG Highway, Ahmedabad 380054',
      gstin: '24AABCE1234F1Z5',
      website: 'https://eventco.in',
      isVerified: true,
      members: {
        create: [
          { userId: vikram.id, role: 'OWNER', joinedAt: new Date('2024-01-15'), isActive: true },
          { userId: priya.id, role: 'OPERATIONS_MANAGER', joinedAt: new Date('2024-02-01'), isActive: true },
          { userId: arjun.id, role: 'FIELD_COORDINATOR', joinedAt: new Date('2024-03-10'), isActive: true },
        ],
      },
    },
  });

  // ── 5. STANDALONE JOBS (various statuses) ─────────────────────────────────
  console.log('5/14  Jobs...');

  const job1 = await prisma.job.upsert({
    where: { slug: 'brand-activation-promoter-needed-today-abc12345' },
    update: {},
    create: {
      slug: 'brand-activation-promoter-needed-today-abc12345',
      title: 'Brand Activation Promoter Needed at Ahmedabad One',
      description: 'We are looking for three energetic promoters for a high-visibility brand activation event at Ahmedabad One Mall. Duties include engaging customers, distributing product samples, and collecting feedback forms. Smart appearance and good communication skills are essential. Hindi and Gujarati speaking preferred.',
      shortDescription: 'Energetic promoters needed for brand activation at Ahmedabad One Mall. ₹800/day.',
      category: 'Promoter', categorySlug: 'promoter',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Vastrapur',
      locationLat: 23.0469, locationLng: 72.5058,
      payRate: 800, payUnit: 'DAY',
      workDate: d(2), vacancies: 3, status: 'PUBLISHED',
      isFeatured: true, featuredUntil: d(7),
      viewCount: 124,
      posterId: vikram.id, organizationId: org.id,
      expiresAt: d(14),
    },
  });

  const job2 = await prisma.job.upsert({
    where: { slug: 'event-photographer-corporate-launch-def67890' },
    update: {},
    create: {
      slug: 'event-photographer-corporate-launch-def67890',
      title: 'Event Photographer for Corporate Product Launch',
      description: 'EventCo is hiring a professional photographer for a corporate product launch by a leading FMCG brand. The assignment covers the full-day event including executive headshots, product showcase photography, and candid event coverage. High-resolution edited images required within 48 hours. Own DSLR essential.',
      shortDescription: 'Full-day corporate product launch photography in Ahmedabad. ₹1500/day.',
      category: 'Photographer', categorySlug: 'photographer',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'GIFT City',
      locationLat: 23.1626, locationLng: 72.6849,
      payRate: 1500, payUnit: 'DAY',
      workDate: d(3), vacancies: 1, status: 'PUBLISHED',
      isFeatured: false, viewCount: 89,
      posterId: vikram.id, organizationId: org.id,
      expiresAt: d(14),
    },
  });

  const job3 = await prisma.job.upsert({
    where: { slug: 'videographer-reels-social-media-ghi11223' },
    update: {},
    create: {
      slug: 'videographer-reels-social-media-ghi11223',
      title: 'Videographer for Social Media Reels Shoot',
      description: 'Looking for a skilled videographer to film a series of 30-second Instagram Reels for a clothing brand launch. 4 hours shoot, indoor studio setup provided. Must be experienced with phone-quality vertical video, colour grading, and quick turnaround. Own gimbal a plus.',
      shortDescription: 'Reels shoot for clothing brand. 4 hours, ₹600/hour.',
      category: 'Videographer', categorySlug: 'videographer',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'CG Road',
      locationLat: 23.0332, locationLng: 72.5617,
      payRate: 600, payUnit: 'HOUR',
      workDate: d(4), vacancies: 1, status: 'PUBLISHED',
      viewCount: 56, posterId: priya.id, organizationId: org.id,
      expiresAt: d(14),
    },
  });

  const job4 = await prisma.job.upsert({
    where: { slug: 'event-helpers-navratri-setup-jkl33445' },
    update: {},
    create: {
      slug: 'event-helpers-navratri-setup-jkl33445',
      title: 'Event Helpers Needed for Navratri Ground Setup',
      description: 'We need 5 reliable event helpers for setting up and managing a large Navratri garba ground at GMDC Grounds. Work includes stall setup, stage arrangement, wristband distribution, and crowd management. Physical fitness required. Evening and night shifts available.',
      shortDescription: 'Event helpers for Navratri setup at GMDC Grounds. ₹700/day.',
      category: 'Event Helper', categorySlug: 'event-helper',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Ahmedabad University Road',
      locationLat: 23.0393, locationLng: 72.5667,
      payRate: 700, payUnit: 'DAY',
      workDate: d(5), vacancies: 5, status: 'PUBLISHED',
      viewCount: 203, posterId: vikram.id, organizationId: org.id,
      expiresAt: d(14),
    },
  });

  const job5 = await prisma.job.upsert({
    where: { slug: 'brand-ambassador-fmcg-roadshow-mno55667' },
    update: {},
    create: {
      slug: 'brand-ambassador-fmcg-roadshow-mno55667',
      title: 'Brand Ambassador for FMCG Road Show Campaign',
      description: 'Join our team for a 3-day road show across Ahmedabad covering Satellite, Navrangpura, and Vastrapur areas. You will represent a leading health drink brand, conduct live demos, and distribute product samples. Smart casual dress required. Incentive bonus on targets.',
      shortDescription: '3-day road show for health drink brand. ₹900/day + incentives.',
      category: 'Brand Ambassador', categorySlug: 'brand-ambassador',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Satellite',
      locationLat: 23.0227, locationLng: 72.5075,
      payRate: 900, payUnit: 'DAY',
      workDate: d(6), workDateEnd: d(8), vacancies: 4, status: 'PUBLISHED',
      isFeatured: true, featuredUntil: d(10),
      viewCount: 178, posterId: vikram.id, organizationId: org.id,
      expiresAt: d(14),
    },
  });

  // A DRAFT job (visible on My Jobs page)
  const job6 = await prisma.job.upsert({
    where: { slug: 'hostess-exhibition-stall-pqr77889' },
    update: {},
    create: {
      slug: 'hostess-exhibition-stall-pqr77889',
      title: 'Hostess Required for Exhibition Stall at Vibrant Gujarat',
      description: 'We need a well-presented, confident hostess to manage our exhibition stall at Vibrant Gujarat Summit. Duties include greeting delegates, distributing brochures, managing visitor sign-ins, and coordinating with the events team. Formal attire provided.',
      shortDescription: 'Hostess for exhibition stall at Vibrant Gujarat. ₹1200/day.',
      category: 'Hostess', categorySlug: 'hostess',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Mahatma Mandir',
      locationLat: 23.1481, locationLng: 72.6739,
      payRate: 1200, payUnit: 'DAY',
      workDate: d(15), vacancies: 2, status: 'DRAFT',
      posterId: vikram.id, organizationId: org.id,
    },
  });

  // A CLOSED job (completed in the past)
  const job7 = await prisma.job.upsert({
    where: { slug: 'mc-anchor-product-launch-stu99001' },
    update: {},
    create: {
      slug: 'mc-anchor-product-launch-stu99001',
      title: 'MC / Anchor for Product Launch Event',
      description: 'Experienced MC required to anchor a 3-hour product launch event for a leading automobile brand. Fluency in Hindi and English required. Script provided in advance. Professional experience in corporate anchoring preferred.',
      shortDescription: 'MC / Anchor for automobile product launch. ₹2000 fixed.',
      category: 'MC / Anchor', categorySlug: 'mc-anchor',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Hotel Hyatt',
      locationLat: 23.0469, locationLng: 72.5058,
      payRate: 2000, payUnit: 'FIXED',
      workDate: d(-10), vacancies: 1, status: 'CLOSED',
      viewCount: 340, posterId: vikram.id, organizationId: org.id,
    },
  });

  // Add skills to jobs
  await prisma.jobSkill.createMany({
    skipDuplicates: true,
    data: [
      { jobId: job1.id, skillId: skillMap['promoter'] },
      { jobId: job1.id, skillId: skillMap['brand-ambassador'] },
      { jobId: job2.id, skillId: skillMap['photographer'] },
      { jobId: job3.id, skillId: skillMap['videographer'] },
      { jobId: job3.id, skillId: skillMap['photo-editor'] },
      { jobId: job4.id, skillId: skillMap['event-helper'] },
      { jobId: job5.id, skillId: skillMap['brand-ambassador'] },
      { jobId: job5.id, skillId: skillMap['promoter'] },
      { jobId: job7.id, skillId: skillMap['mc-anchor'] },
    ],
  });

  // Saved jobs
  await prisma.savedJob.createMany({
    skipDuplicates: true,
    data: [
      { userId: rahul.id, jobId: job2.id },
      { userId: rahul.id, jobId: job3.id },
      { userId: anjali.id, jobId: job1.id },
      { userId: anjali.id, jobId: job5.id },
    ],
  });

  // Saved workers
  await prisma.savedWorker.createMany({
    skipDuplicates: true,
    data: [
      { saverId: vikram.id, workerId: rahul.id },
      { saverId: vikram.id, workerId: anjali.id },
      { saverId: priya.id, workerId: meera.id },
    ],
  });

  // ── 6. APPLICATIONS ───────────────────────────────────────────────────────
  console.log('6/14  Applications...');

  // job1 — Brand Promoter (3 applicants)
  const app1 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job1.id, applicantId: anjali.id } },
    update: {}, create: {
      jobId: job1.id, applicantId: anjali.id, status: 'HIRED',
      coverNote: 'I have 2 years of promoter experience and am fully available on the day. Worked with Pepsi road shows before.',
    },
  });

  const app1b = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job1.id, applicantId: dev.id } },
    update: {}, create: {
      jobId: job1.id, applicantId: dev.id, status: 'PENDING',
      coverNote: 'New to promoter work but very enthusiastic and a fast learner. Available on the job date.',
    },
  });

  const app1c = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job1.id, applicantId: meera.id } },
    update: {}, create: {
      jobId: job1.id, applicantId: meera.id, status: 'SHORTLISTED',
      coverNote: 'I can do event promotion in addition to video work. Happy to help with brand activation.',
    },
  });

  // job2 — Photographer (2 applicants)
  const app2 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job2.id, applicantId: rahul.id } },
    update: {}, create: {
      jobId: job2.id, applicantId: rahul.id, status: 'HIRED',
      coverNote: 'I have covered 20+ corporate events. Delivering high-res edited images within 24 hours is my standard practice.',
    },
  });

  const app2b = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job2.id, applicantId: meera.id } },
    update: {}, create: {
      jobId: job2.id, applicantId: meera.id, status: 'REJECTED',
      coverNote: 'I can do both photos and video for this shoot.',
    },
  });

  // job3 — Videographer (1 applicant)
  const app3 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job3.id, applicantId: meera.id } },
    update: {}, create: {
      jobId: job3.id, applicantId: meera.id, status: 'PENDING',
      coverNote: 'I have shot several Instagram Reels campaigns. Own a DJI gimbal and can deliver same-day cuts.',
    },
  });

  // job4 — Event Helpers (3 applicants)
  const app4a = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job4.id, applicantId: dev.id } },
    update: {}, create: {
      jobId: job4.id, applicantId: dev.id, status: 'PENDING',
      coverNote: 'Ready to help with Navratri setup. Physically fit and available for night shift.',
    },
  });

  // job7 (closed) — MC Anchor — the completed hire we'll build full history for
  const app7 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job7.id, applicantId: anjali.id } },
    update: {}, create: {
      jobId: job7.id, applicantId: anjali.id, status: 'HIRED',
      coverNote: 'I have anchored 10+ corporate events. Fluent in Hindi and Gujarati. Can adapt the script on the fly.',
    },
  });

  // ── 7. HIRES (ACTIVE + COMPLETED) ────────────────────────────────────────
  console.log('7/14  Hires...');

  // ACTIVE hire — Anjali on job1 (upcoming)
  const hire1 = await prisma.hire.upsert({
    where: { applicationId: app1.id }, update: {},
    create: {
      jobId: job1.id, workerId: anjali.id, employerId: vikram.id,
      applicationId: app1.id, status: 'ACTIVE',
      agreedRate: 800, agreedUnit: 'DAY',
      startTime: d(2, 9), endTime: d(2, 18),
    },
  });

  // ACTIVE hire — Rahul on job2 (upcoming, with attendance)
  const hire2 = await prisma.hire.upsert({
    where: { applicationId: app2.id }, update: {},
    create: {
      jobId: job2.id, workerId: rahul.id, employerId: vikram.id,
      applicationId: app2.id, status: 'ACTIVE',
      agreedRate: 1500, agreedUnit: 'DAY',
      startTime: d(3, 9), endTime: d(3, 18),
    },
  });

  // COMPLETED hire — Anjali on job7 (past, full journey: hire → attend → complete → rated → invoice paid)
  const hire7 = await prisma.hire.upsert({
    where: { applicationId: app7.id }, update: {},
    create: {
      jobId: job7.id, workerId: anjali.id, employerId: vikram.id,
      applicationId: app7.id, status: 'COMPLETED',
      agreedRate: 2000, agreedUnit: 'FIXED',
      startTime: d(-10, 10), endTime: d(-10, 13),
    },
  });

  // ── 8. ATTENDANCE ─────────────────────────────────────────────────────────
  console.log('8/14  Attendance...');

  // Completed hire — attendance record CHECKED_OUT
  await prisma.attendance.upsert({
    where: { id: `att-hire7-day1` },
    update: {},
    create: {
      id: `att-hire7-day1`,
      hireId: hire7.id,
      workDate: d(-10, 0),
      checkInTime: d(-10, 10, 5),
      checkInLat: 23.0469, checkInLng: 72.5058,
      checkInSelfieUrl: 'https://i.pravatar.cc/150?img=45',
      checkOutTime: d(-10, 13, 20),
      checkOutLat: 23.0469, checkOutLng: 72.5058,
      totalHours: 3.25, status: 'CHECKED_OUT',
    },
  });

  // ── 9. CHAT + MESSAGES ────────────────────────────────────────────────────
  console.log('9/14  Chats & messages...');

  // Chat for active hire1 (vikram ↔ anjali)
  const chat1 = await prisma.chat.upsert({
    where: { hireId: hire1.id }, update: {},
    create: {
      hireId: hire1.id, jobId: job1.id,
      participants: { create: [
        { userId: vikram.id }, { userId: anjali.id },
      ]},
    },
  });

  await prisma.message.createMany({
    skipDuplicates: true,
    data: [
      { chatId: chat1.id, senderId: vikram.id, content: 'Hi Anjali! Looking forward to the activation tomorrow. Please be at Ahmedabad One Mall entrance at 9am sharp.', isRead: true, createdAt: d(-1, 14) },
      { chatId: chat1.id, senderId: anjali.id, content: 'Hi Vikram sir! Confirmed. I will be there at 9am. Should I carry any specific materials?', isRead: true, createdAt: d(-1, 14, 30) },
      { chatId: chat1.id, senderId: vikram.id, content: 'No, everything will be arranged at the venue. Just wear smart casuals and bring your ID.', isRead: true, createdAt: d(-1, 15) },
      { chatId: chat1.id, senderId: anjali.id, content: 'Perfect. See you tomorrow! 🙌', isRead: false, createdAt: d(-1, 15, 5) },
    ],
  });

  // Chat for hire2 (vikram ↔ rahul)
  const chat2 = await prisma.chat.upsert({
    where: { hireId: hire2.id }, update: {},
    create: {
      hireId: hire2.id, jobId: job2.id,
      participants: { create: [
        { userId: vikram.id }, { userId: rahul.id },
      ]},
    },
  });

  await prisma.message.createMany({
    skipDuplicates: true,
    data: [
      { chatId: chat2.id, senderId: rahul.id, content: 'Hi! Just confirming the shoot location for Day After Tomorrow. Is it the rooftop venue at GIFT City?', isRead: true, createdAt: d(-2, 11) },
      { chatId: chat2.id, senderId: vikram.id, content: 'Yes, Level 3 rooftop, Tower A. I will send you the access pass on the morning.', isRead: true, createdAt: d(-2, 11, 20) },
      { chatId: chat2.id, senderId: rahul.id, content: 'Got it! Bringing my Sony A7 IV and a 70-200 for the stage shots. Will 2 lights suffice or should I bring my portable kit?', isRead: false, createdAt: d(-2, 11, 45) },
    ],
  });

  // ── 10. RATINGS ───────────────────────────────────────────────────────────
  console.log('10/14 Ratings...');

  // Employer rates worker (hire7)
  await prisma.rating.upsert({
    where: { hireId_giverId: { hireId: hire7.id, giverId: vikram.id } },
    update: {},
    create: {
      hireId: hire7.id, giverId: vikram.id, receiverId: anjali.id,
      targetType: 'WORKER',
      skillQuality: 4, communication: 5, professionalism: 4, punctuality: 5,
      overallScore: 4.5,
      review: 'Anjali was superb — on time, well-presented, and handled the crowd confidently. Would book again.',
    },
  });

  // Worker rates employer (hire7)
  await prisma.rating.upsert({
    where: { hireId_giverId: { hireId: hire7.id, giverId: anjali.id } },
    update: {},
    create: {
      hireId: hire7.id, giverId: anjali.id, receiverId: vikram.id,
      targetType: 'EMPLOYER',
      paymentReliability: 5, communication: 5, workingConditions: 4,
      overallScore: 4.67,
      review: 'Great employer. Clear brief, payment on time, and a well-organised event.',
    },
  });

  // ── 11. INVOICE ───────────────────────────────────────────────────────────
  console.log('11/14 Invoices...');

  const inv = await prisma.invoice.upsert({
    where: { hireId: hire7.id },
    update: {},
    create: {
      invoiceNumber: 'NAB-2025-00001',
      hireId: hire7.id,
      status: 'PAID',
      dueDate: d(-3),
      employerName: 'EventCo Ahmedabad',
      employerAddress: 'B-404, Titanium City Centre, SG Highway, Ahmedabad 380054',
      employerGstin: '24AABCE1234F1Z5',
      employerOrgId: org.id,
      workerName: 'Anjali Singh',
      workerPhone: '9000000004',
      workerUpiId: 'anjali.singh@upi',
      jobTitle: 'MC / Anchor for Product Launch Event',
      workDate: d(-10, 0),
      checkInTime: d(-10, 10, 5),
      checkOutTime: d(-10, 13, 20),
      totalHours: 3.25,
      subtotal: 2000, platformFee: 99,
      gstApplicable: true, gstRate: 0.18, gstAmount: 360,
      tdsApplicable: false, tdsRate: 0, tdsAmount: 0,
      totalPayable: 2459,
      paymentMethod: 'UPI', paymentReference: 'UPI789012345',
      paymentDate: d(-8),
      lineItems: {
        create: [{
          description: 'MC / Anchor — Product Launch (Fixed)',
          quantity: 1, unit: 'FIXED', rate: 2000, amount: 2000,
        }],
      },
    },
  });

  // Pending invoice for active hire1
  await prisma.invoice.upsert({
    where: { hireId: hire1.id },
    update: {},
    create: {
      invoiceNumber: 'NAB-2025-00002',
      hireId: hire1.id,
      status: 'PENDING',
      dueDate: d(9),
      employerName: 'EventCo Ahmedabad',
      employerAddress: 'B-404, Titanium City Centre, SG Highway, Ahmedabad 380054',
      employerGstin: '24AABCE1234F1Z5',
      employerOrgId: org.id,
      workerName: 'Anjali Singh',
      workerPhone: '9000000004',
      workerUpiId: 'anjali.singh@upi',
      jobTitle: 'Brand Activation Promoter Needed at Ahmedabad One',
      workDate: d(2, 0),
      subtotal: 800, platformFee: 99,
      gstApplicable: false, gstRate: 0.18, gstAmount: 0,
      tdsApplicable: false, tdsRate: 0, tdsAmount: 0,
      totalPayable: 899,
      lineItems: {
        create: [{
          description: 'Brand Activation Promoter — Day Rate',
          quantity: 1, unit: 'DAY', rate: 800, amount: 800,
        }],
      },
    },
  });

  // ── 12. EVENT ─────────────────────────────────────────────────────────────
  console.log('12/14 Events...');

  const event = await prisma.event.upsert({
    where: { id: 'demo-event-brand-summit-2025' },
    update: {},
    create: {
      id: 'demo-event-brand-summit-2025',
      organizationId: org.id,
      title: 'Ahmedabad Brand Summit 2025',
      description: 'Three-day BTL activation and brand experience summit bringing together 50+ brands and 10,000+ consumers at Ahmedabad One Mall.',
      venue: 'Ahmedabad One Mall, Ground Floor Atrium',
      city: 'Ahmedabad', citySlug: 'ahmedabad',
      locationLat: 23.0469, locationLng: 72.5058,
      startDate: d(10, 9), endDate: d(12, 21),
      status: 'PUBLISHED',
      roles: {
        create: [
          { title: 'Brand Promoter', description: 'Engage customers and demonstrate products at brand stalls.', vacancies: 6, payRate: 800, payUnit: 'DAY' },
          { title: 'Event Photographer', description: 'Cover the full 3-day summit with high-res images.', vacancies: 2, payRate: 1500, payUnit: 'DAY' },
          { title: 'Ground Coordinator', description: 'Manage logistics, stall setup, and crowd flow.', vacancies: 3, payRate: 900, payUnit: 'DAY' },
        ],
      },
    },
  });

  // Fetch roles
  const roles = await prisma.eventRole.findMany({ where: { eventId: event.id } });
  const rolePromoter   = roles.find(r => r.title === 'Brand Promoter')!;
  const rolePhoto      = roles.find(r => r.title === 'Event Photographer')!;
  const roleCoord      = roles.find(r => r.title === 'Ground Coordinator')!;

  // Create jobs from event roles
  const eventJob1 = await prisma.job.upsert({
    where: { slug: 'brand-promoter-ahmedabad-brand-summit-2025-ev1r1' },
    update: {},
    create: {
      slug: 'brand-promoter-ahmedabad-brand-summit-2025-ev1r1',
      title: 'Brand Promoter', categorySlug: 'promoter', category: 'Promoter',
      description: 'Ahmedabad Brand Summit 2025 — Ahmedabad One Mall, Ground Floor Atrium — Engage customers and demonstrate products at brand stalls.',
      shortDescription: 'Brand promoter for 3-day summit at Ahmedabad One Mall.',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Ahmedabad One Mall',
      locationLat: 23.0469, locationLng: 72.5058,
      payRate: 800, payUnit: 'DAY', vacancies: 6,
      workDate: d(10, 9), workDateEnd: d(12, 21),
      status: 'PUBLISHED', posterId: vikram.id,
      organizationId: org.id, eventId: event.id, eventRoleId: rolePromoter.id,
      expiresAt: d(20),
    },
  });

  const eventJob2 = await prisma.job.upsert({
    where: { slug: 'event-photographer-ahmedabad-brand-summit-2025-ev1r2' },
    update: {},
    create: {
      slug: 'event-photographer-ahmedabad-brand-summit-2025-ev1r2',
      title: 'Event Photographer', categorySlug: 'photographer', category: 'Photographer',
      description: 'Ahmedabad Brand Summit 2025 — Ahmedabad One Mall, Ground Floor Atrium — Cover the full 3-day summit with high-res images.',
      shortDescription: 'Photographer for 3-day brand summit.',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Ahmedabad One Mall',
      locationLat: 23.0469, locationLng: 72.5058,
      payRate: 1500, payUnit: 'DAY', vacancies: 2,
      workDate: d(10, 9), workDateEnd: d(12, 21),
      status: 'PUBLISHED', posterId: vikram.id,
      organizationId: org.id, eventId: event.id, eventRoleId: rolePhoto.id,
      expiresAt: d(20),
    },
  });

  const eventJob3 = await prisma.job.upsert({
    where: { slug: 'ground-coordinator-ahmedabad-brand-summit-2025-ev1r3' },
    update: {},
    create: {
      slug: 'ground-coordinator-ahmedabad-brand-summit-2025-ev1r3',
      title: 'Ground Coordinator', categorySlug: 'event-coordinator', category: 'Event Coordinator',
      description: 'Ahmedabad Brand Summit 2025 — Ahmedabad One Mall, Ground Floor Atrium — Manage logistics, stall setup, and crowd flow.',
      shortDescription: 'Ground coordinator for 3-day brand summit.',
      city: 'Ahmedabad', citySlug: 'ahmedabad', area: 'Ahmedabad One Mall',
      locationLat: 23.0469, locationLng: 72.5058,
      payRate: 900, payUnit: 'DAY', vacancies: 3,
      workDate: d(10, 9), workDateEnd: d(12, 21),
      status: 'PUBLISHED', posterId: vikram.id,
      organizationId: org.id, eventId: event.id, eventRoleId: roleCoord.id,
      expiresAt: d(20),
    },
  });

  // Applications to event jobs
  const appEv1 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: eventJob1.id, applicantId: anjali.id } },
    update: {}, create: {
      jobId: eventJob1.id, applicantId: anjali.id, status: 'PENDING',
      coverNote: 'Excited to join the Brand Summit! I have done 3 multi-day activations before.',
    },
  });

  const appEv2 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: eventJob2.id, applicantId: rahul.id } },
    update: {}, create: {
      jobId: eventJob2.id, applicantId: rahul.id, status: 'SHORTLISTED',
      coverNote: 'Multi-day event shoots are my specialty. Can deliver daily image dumps by 11pm.',
    },
  });

  const appEv3 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: eventJob1.id, applicantId: dev.id } },
    update: {}, create: {
      jobId: eventJob1.id, applicantId: dev.id, status: 'PENDING',
      coverNote: 'Looking forward to my first multi-day event. Ready to learn and contribute!',
    },
  });

  const appEv4 = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: eventJob3.id, applicantId: arjun.id } },
    update: {}, create: {
      jobId: eventJob3.id, applicantId: arjun.id, status: 'PENDING',
      coverNote: 'I have coordinated ground logistics for 8+ events including Navratri and Garba grounds.',
    },
  });

  // ── 13. DISPUTE ───────────────────────────────────────────────────────────
  console.log('13/14 Dispute...');

  // We need a second COMPLETED hire for the dispute (reuse job4 with a synthetic app)
  // Create a separate completed hire on job4 to attach a dispute
  const appDispute = await prisma.application.upsert({
    where: { jobId_applicantId: { jobId: job4.id, applicantId: rahul.id } },
    update: {}, create: {
      jobId: job4.id, applicantId: rahul.id, status: 'HIRED',
      coverNote: 'Happy to help with setup work as well. Can manage teams effectively.',
    },
  });

  const hireDispute = await prisma.hire.upsert({
    where: { applicationId: appDispute.id }, update: {},
    create: {
      jobId: job4.id, workerId: rahul.id, employerId: vikram.id,
      applicationId: appDispute.id, status: 'DISPUTED',
      agreedRate: 700, agreedUnit: 'DAY',
      startTime: d(-5, 8), endTime: d(-5, 20),
    },
  });

  const dispute = await prisma.dispute.upsert({
    where: { hireId: hireDispute.id }, update: {},
    create: {
      hireId: hireDispute.id, raisedById: rahul.id,
      type: 'PAYMENT_DISPUTE',
      status: 'UNDER_REVIEW',
      description: 'The employer confirmed my work was satisfactory and the invoice was generated, but payment has not been received after 5 days. The agreed rate was ₹700/day for full day event setup work. Invoice NAB-2025-00003 shows PENDING status.',
    },
  });

  await prisma.disputeEvidence.createMany({
    skipDuplicates: true,
    data: [
      {
        disputeId: dispute.id, uploadedById: rahul.id,
        fileUrl: 'https://picsum.photos/seed/evidence1/400/300',
        fileType: 'IMAGE',
        description: 'Screenshot of invoice showing PENDING payment status',
      },
    ],
  });

  // ── 14. NOTIFICATIONS ─────────────────────────────────────────────────────
  console.log('14/14 Notifications...');

  await prisma.notification.createMany({
    skipDuplicates: false,
    data: [
      // Anjali's notifications
      { userId: anjali.id, type: 'APPLICATION_HIRED', title: 'You got hired!', body: 'EventCo Ahmedabad hired you for Brand Activation Promoter Needed at Ahmedabad One.', isRead: false, data: { hireId: hire1.id } },
      { userId: anjali.id, type: 'REVIEW_RECEIVED', title: 'New Review Received', body: 'Vikram Shah left you a 4.5⭐ review for "MC / Anchor for Product Launch Event"', isRead: true, data: { hireId: hire7.id } },
      { userId: anjali.id, type: 'INVOICE_GENERATED', title: 'Invoice Generated', body: 'Invoice NAB-2025-00002 for ₹899 is ready.', isRead: false, data: { invoiceId: inv.id } },
      // Rahul's notifications
      { userId: rahul.id, type: 'APPLICATION_HIRED', title: 'You got hired!', body: 'EventCo Ahmedabad hired you for Event Photographer for Corporate Product Launch.', isRead: false, data: { hireId: hire2.id } },
      { userId: rahul.id, type: 'APPLICATION_SHORTLISTED', title: 'You were shortlisted!', body: 'EventCo Ahmedabad shortlisted your application for Event Photographer at Brand Summit.', isRead: true, data: {} },
      { userId: rahul.id, type: 'DISPUTE_OPENED', title: 'Dispute Under Review', body: 'Your payment dispute has been escalated for admin review.', isRead: false, data: { disputeId: dispute.id } },
      // Vikram's notifications
      { userId: vikram.id, type: 'APPLICATION_RECEIVED', title: 'New Application', body: 'Dev Patel applied for Brand Activation Promoter Needed at Ahmedabad One.', isRead: true, data: { jobId: job1.id } },
      { userId: vikram.id, type: 'DISPUTE_OPENED', title: 'New Dispute Requires Review', body: 'Dispute raised on hire: Event Helpers Needed for Navratri Ground Setup (PAYMENT_DISPUTE)', isRead: false, data: { disputeId: dispute.id } },
      { userId: vikram.id, type: 'REVIEW_RECEIVED', title: 'New Review', body: 'Anjali Singh gave you a 4.67⭐ review.', isRead: true, data: {} },
    ],
  });

  // ── AVAILABILITY SLOTS ────────────────────────────────────────────────────
  await prisma.availabilitySlot.createMany({
    skipDuplicates: true,
    data: [
      // Rahul is unavailable for 3 days next week
      { userId: rahul.id, date: todayMidnight(8),  isAvailable: false },
      { userId: rahul.id, date: todayMidnight(9),  isAvailable: false },
      { userId: rahul.id, date: todayMidnight(10), isAvailable: false },
      // Anjali marks herself unavailable on one day
      { userId: anjali.id, date: todayMidnight(15), isAvailable: false },
    ],
  });

  // ── AUDIT LOG ─────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: vikram.id, action: 'JOB_PUBLISHED', entityType: 'Job', entityId: job1.id, metadata: { title: job1.title } },
      { userId: vikram.id, action: 'HIRE_CREATED',  entityType: 'Hire', entityId: hire1.id },
      { userId: vikram.id, action: 'HIRE_CREATED',  entityType: 'Hire', entityId: hire2.id },
      { userId: anjali.id, action: 'HIRE_COMPLETED', entityType: 'Hire', entityId: hire7.id },
    ],
  });

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n✅ Demo seed complete!\n');
  console.log('📊 Database summary:');
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.workerProfile.count(),
    prisma.organization.count(),
    prisma.skill.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.hire.count(),
    prisma.attendance.count(),
    prisma.chat.count(),
    prisma.message.count(),
    prisma.rating.count(),
    prisma.invoice.count(),
    prisma.notification.count(),
    prisma.event.count(),
    prisma.eventRole.count(),
    prisma.dispute.count(),
    prisma.savedJob.count(),
    prisma.savedWorker.count(),
    prisma.availabilitySlot.count(),
    prisma.auditLog.count(),
  ]);
  const labels = ['Users','WorkerProfiles','Organizations','Skills','Jobs','Applications','Hires',
    'Attendance','Chats','Messages','Ratings','Invoices','Notifications','Events','EventRoles',
    'Disputes','SavedJobs','SavedWorkers','AvailabilitySlots','AuditLogs'];
  labels.forEach((l, i) => console.log(`   ${l.padEnd(20)} ${counts[i]}`));

  console.log('\n🔐 Login phones:');
  console.log('   Admin/Employer  : 9000000001  (Vikram Shah)');
  console.log('   Employer 2      : 9000000002  (Priya Desai)');
  console.log('   Worker 1        : 9000000003  (Rahul Mehta — photographer)');
  console.log('   Worker 2        : 9000000004  (Anjali Singh — promoter)');
  console.log('   Worker 3        : 9000000005  (Dev Patel   — new worker)');
  console.log('   Worker 4        : 9000000006  (Meera Joshi — videographer)');
  console.log('   Coordinator     : 9000000007  (Arjun Nair)');
  console.log('\nOTP appears in API terminal (SMS_PROVIDER=console)\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
