# Nabora API — Local Setup & Testing Guide

This guide gets the API running locally from scratch, end to end, and walks through every feature in order.

---

## Prerequisites

Install these before starting:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | comes with Node |
| Docker Desktop | latest | https://docker.com/get-started |
| Git | any | https://git-scm.com |

Verify:
```bash
node -v   # v20.x.x
npm -v    # 10.x.x
docker -v # Docker version 24+
```

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/dhruv861/nabora-api.git
cd nabora-api
npm install
```

---

## Step 2 — Start PostgreSQL + Redis with Docker

Create this file in the project root as `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: nabora-postgres
    environment:
      POSTGRES_USER: nabora
      POSTGRES_PASSWORD: nabora123
      POSTGRES_DB: nabora
    ports:
      - '5432:5432'
    volumes:
      - nabora_pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: nabora-redis
    ports:
      - '6379:6379'

volumes:
  nabora_pg_data:
```

Start both services:
```bash
docker compose up -d
```

Verify they are running:
```bash
docker ps
# Should show: nabora-postgres, nabora-redis
```

---

## Step 3 — Create `.env`

Create a file named `.env` in the project root:

```env
# App
NODE_ENV=development
PORT=3000

# Database (Docker)
DATABASE_URL="postgresql://nabora:nabora123@localhost:5432/nabora?schema=public"
DIRECT_URL="postgresql://nabora:nabora123@localhost:5432/nabora?schema=public"

# JWT
JWT_SECRET=local-dev-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Redis (Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudflare R2 — use MOCK values for local (upload will store to /tmp)
R2_ACCOUNT_ID=mock-account-id
R2_ACCESS_KEY_ID=mock-access-key
R2_SECRET_ACCESS_KEY=mock-secret-key
R2_BUCKET_NAME=nabora-local
R2_PUBLIC_URL=http://localhost:3000/mock-files

# Firebase — paste your Firebase service account JSON as a single-line string
# For local testing, use the OTP bypass (see Step 6 below)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# SMS — for local testing, OTP is logged to console (see Step 6)
SMS_PROVIDER=console

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3001
```

> **Note on Firebase & SMS for local testing:** See Step 6 — you can bypass real OTP in development.

---

## Step 4 — Run Prisma migrations

```bash
# Push schema to DB and create all tables
npx prisma migrate dev --name init

# If that fails (first time), use db push instead:
npx prisma db push
```

Then add the PostGIS generated columns (required for GPS features):

```bash
# Connect to Postgres and run this SQL
docker exec -it nabora-postgres psql -U nabora -d nabora -c "
  ALTER TABLE \"Job\" ADD COLUMN IF NOT EXISTS location_point geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(\"locationLng\", \"locationLat\"), 4326)) STORED;
  ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS location_point geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(\"locationLng\", \"locationLat\"), 4326)) STORED;
  ALTER TABLE \"Event\" ADD COLUMN IF NOT EXISTS location_point geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(\"locationLng\", \"locationLat\"), 4326)) STORED;
  CREATE INDEX IF NOT EXISTS idx_job_location_point ON \"Job\" USING GIST(location_point);
  CREATE INDEX IF NOT EXISTS idx_user_location_point ON \"User\" USING GIST(location_point);
  CREATE INDEX IF NOT EXISTS idx_event_location_point ON \"Event\" USING GIST(location_point);
"
```

---

## Step 5 — Seed the database

```bash
npm run seed
# Output: ✅ Seeded 12 skills successfully
```

This creates 12 skills (Promoter, Hostess, Photographer, etc.) required by many features.

---

## Step 6 — Console OTP bypass (avoid real SMS locally)

The SMS provider is set to `console` in `.env`. You need to make the SmsProvider log the OTP instead of sending it.

Open `src/providers/sms/providers/console.sms.provider.ts` — if it doesn't exist, create it:

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsoleSmsProvider {
  async sendOtp(phone: string, otp: string): Promise<void> {
    console.log(`\n========================================`);
    console.log(`📱 OTP for ${phone}: ${otp}`);
    console.log(`========================================\n`);
  }
}
```

The OTP will appear in the terminal when you call `POST /auth/send-otp`.

---

## Step 7 — Start the API

```bash
npm run start:dev
```

Expected output:
```
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG Application is running on: http://localhost:3000
```

Open Swagger UI: **http://localhost:3000/docs**

---

## Step 8 — Create an admin user (needed for admin portal testing)

Connect to the DB directly:
```bash
docker exec -it nabora-postgres psql -U nabora -d nabora
```

Run:
```sql
-- After you register your first user via OTP, get their ID:
SELECT id, phone FROM "User" LIMIT 5;

-- Set them as admin:
UPDATE "User" SET "isAdmin" = true WHERE phone = 'YOUR_PHONE_NUMBER';
\q
```

---

# Testing Guide — Feature by Feature

All requests below use **curl**. Import to Postman or use Swagger at http://localhost:3000/docs.

Set a variable after login:
```bash
TOKEN="paste-your-jwt-here"
```

---

## ✅ Sprint 1 — Auth & Profile

### 1.1 Send OTP
```bash
curl -X POST http://localhost:3000/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "9876543210"}'
```
Expected: `{"success": true, "message": "OTP sent"}`  
Check terminal for: `📱 OTP for 9876543210: 123456`

### 1.2 Verify OTP & get JWT
```bash
curl -X POST http://localhost:3000/v1/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "9876543210", "otp": "123456"}'
```
Expected: `{ success: true, data: { token: "eyJ...", isNew: true } }`  
Copy the token: `TOKEN="eyJ..."`

### 1.3 Get my profile
```bash
curl http://localhost:3000/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 1.4 Update profile
```bash
curl -X PATCH http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name": "Dhruv Patel", "bio": "Full-stack developer turned event photographer", "availabilityStatus": "AVAILABLE_NOW"}'
```

### 1.5 Update location
```bash
curl -X PATCH http://localhost:3000/v1/users/me/location \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"lat": 23.0225, "lng": 72.5714, "city": "Ahmedabad", "citySlug": "ahmedabad", "area": "Vastrapur"}'
```

### 1.6 Create worker profile
```bash
curl -X POST http://localhost:3000/v1/users/me/worker-profile \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"headline": "Freelance Photographer", "categorySlug": "photographer", "yearsExp": 3}'
```

### 1.7 Get all skills
```bash
curl http://localhost:3000/v1/skills
# Should return 12 seeded skills
```

---

## ✅ Sprint 2 — Jobs Marketplace

### 2.1 Create a job
```bash
curl -X POST http://localhost:3000/v1/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Brand Activation Promoter Needed",
    "description": "We need an energetic promoter for a 1-day brand activation event at Ahmedabad One Mall. You will engage with customers and distribute product samples.",
    "shortDescription": "1-day brand activation at Ahmedabad One Mall. 800/day.",
    "category": "Promoter",
    "categorySlug": "promoter",
    "city": "Ahmedabad",
    "citySlug": "ahmedabad",
    "area": "Vastrapur",
    "locationLat": 23.0469,
    "locationLng": 72.5058,
    "payRate": 800,
    "payUnit": "DAY",
    "workDate": "2025-12-15T09:00:00Z",
    "vacancies": 3
  }'
```
Save the job ID: `JOB_ID="cuid..."`

### 2.2 Publish the job
```bash
curl -X POST http://localhost:3000/v1/jobs/$JOB_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```
Expected: status changes from `DRAFT` to `PUBLISHED`

### 2.3 Browse job feed (with location)
```bash
curl "http://localhost:3000/v1/jobs?lat=23.0225&lng=72.5714&section=nearby"
```
Expected: array of published jobs with `distanceKm` field

### 2.4 Save a job
```bash
curl -X POST http://localhost:3000/v1/users/me/saved-jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 2.5 Get saved jobs
```bash
curl http://localhost:3000/v1/users/me/saved-jobs \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Sprint 3 — Applications & Hiring

Register a second user (the worker) — repeat Steps 1.1–1.2 with phone `9876543211`:
```bash
# In a new terminal
WORKER_TOKEN="eyJ..."
WORKER_ID="cuid..."
```

### 3.1 Apply for a job (as worker)
```bash
curl -X POST http://localhost:3000/v1/jobs/$JOB_ID/apply \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"coverNote": "I have 2 years of promoter experience and am fully available on the job date."}'
```
Save: `APP_ID="cuid..."`

### 3.2 View applicants (as employer)
```bash
curl http://localhost:3000/v1/jobs/$JOB_ID/applications \
  -H "Authorization: Bearer $TOKEN"
```

### 3.3 Shortlist the applicant
```bash
curl -X PATCH http://localhost:3000/v1/jobs/$JOB_ID/applications/$APP_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status": "SHORTLISTED"}'
```

### 3.4 Hire the applicant
```bash
curl -X POST http://localhost:3000/v1/applications/$APP_ID/hire \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"agreedRate": 800, "agreedUnit": "DAY"}'
```
Save: `HIRE_ID="cuid..."`

---

## ✅ Sprint 4 — Real-Time Chat

### 4.1 List my chats
```bash
curl http://localhost:3000/v1/chats \
  -H "Authorization: Bearer $TOKEN"
```
Save: `CHAT_ID="cuid..."`

### 4.2 Send a message
```bash
curl -X POST http://localhost:3000/v1/chats/$CHAT_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content": "Hi! Looking forward to working with you."}'
```

### 4.3 Get messages
```bash
curl http://localhost:3000/v1/chats/$CHAT_ID/messages \
  -H "Authorization: Bearer $WORKER_TOKEN"
```

### 4.4 Mark as read
```bash
curl -X PATCH http://localhost:3000/v1/chats/$CHAT_ID/read \
  -H "Authorization: Bearer $WORKER_TOKEN"
```

### 4.5 Get notifications
```bash
curl http://localhost:3000/v1/notifications \
  -H "Authorization: Bearer $WORKER_TOKEN"
```

### 4.6 Get unread count
```bash
curl http://localhost:3000/v1/notifications/unread-count \
  -H "Authorization: Bearer $WORKER_TOKEN"
```

### 4.7 Test Socket.IO (optional)
```bash
# Install wscat globally
npm install -g wscat

# Connect (replace TOKEN)
wscat -c "ws://localhost:3000" \
  --header "Authorization: Bearer $TOKEN"

# After connecting, send:
{"event":"join_chat","data":{"chatId":"CHAT_ID"}}
```

---

## ✅ Sprint 5 — Ratings & Organizations

### 5.1 Complete the hire (employer)
```bash
curl -X POST http://localhost:3000/v1/hires/$HIRE_ID/complete \
  -H "Authorization: Bearer $TOKEN"
```
Check terminal — Bull queue will fire `invoice-generation`.

### 5.2 Rate the worker
```bash
curl -X POST http://localhost:3000/v1/hires/$HIRE_ID/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "targetType": "WORKER",
    "skillQuality": 5,
    "communication": 4,
    "professionalism": 5,
    "punctuality": 4,
    "review": "Excellent promoter, very engaging with customers."
  }'
```

### 5.3 Rate the employer (as worker)
```bash
curl -X POST http://localhost:3000/v1/hires/$HIRE_ID/ratings \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "targetType": "EMPLOYER",
    "paymentReliability": 5,
    "communication": 4,
    "workingConditions": 5
  }'
```

### 5.4 View worker ratings
```bash
curl http://localhost:3000/v1/users/$WORKER_ID/ratings
```

### 5.5 Create an organization
```bash
curl -X POST http://localhost:3000/v1/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "EventCo Ahmedabad",
    "description": "Premier event management company",
    "city": "Ahmedabad",
    "citySlug": "ahmedabad"
  }'
```
Save: `ORG_ID="cuid..."`

### 5.6 Invite a team member
```bash
curl -X POST http://localhost:3000/v1/organizations/$ORG_ID/members/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"phone": "9876543211", "role": "EVENT_MANAGER"}'
```

---

## ✅ Sprint 6 — Events & Bulk Hiring

### 6.1 Create an event
```bash
curl -X POST http://localhost:3000/v1/organizations/$ORG_ID/events \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Ahmedabad Brand Summit 2025",
    "description": "3-day brand activation and networking summit",
    "venue": "Ahmedabad One Mall",
    "city": "Ahmedabad",
    "citySlug": "ahmedabad",
    "locationLat": 23.0469,
    "locationLng": 72.5058,
    "startDate": "2025-12-20T09:00:00Z",
    "endDate": "2025-12-22T18:00:00Z"
  }'
```
Save: `EVENT_ID="cuid..."`

### 6.2 Add roles to the event
```bash
curl -X POST http://localhost:3000/v1/events/$EVENT_ID/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "roles": [
      {"title": "Brand Promoter", "vacancies": 5, "payRate": 800, "payUnit": "DAY"},
      {"title": "Event Photographer", "vacancies": 2, "payRate": 1500, "payUnit": "DAY"}
    ]
  }'
```

### 6.3 Publish the event (creates 2 jobs automatically)
```bash
curl -X POST http://localhost:3000/v1/events/$EVENT_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```
Expected: event status `PUBLISHED`, 2 `Job` rows created in DB.

### 6.4 Get event applicants (after some applications)
```bash
curl http://localhost:3000/v1/events/$EVENT_ID/applicants \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Sprint 7 — Attendance & Invoices

### 7.1 Check-in (as worker, must be within 500m of job location)
```bash
curl -X POST http://localhost:3000/v1/hires/$HIRE_ID/attendance/check-in \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "lat": 23.0469,
    "lng": 72.5058,
    "selfieUrl": "http://localhost:3000/mock-files/selfie.jpg"
  }'
```
> For local testing: use the same lat/lng as the job location to pass the 500m check.

Save: `ATTENDANCE_ID="cuid..."`

### 7.2 Check-out
```bash
curl -X POST http://localhost:3000/v1/hires/$HIRE_ID/attendance/check-out \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"lat": 23.0469, "lng": 72.5058}'
```
Expected: `totalHours` is computed and returned.

### 7.3 View attendance log
```bash
curl http://localhost:3000/v1/hires/$HIRE_ID/attendance \
  -H "Authorization: Bearer $TOKEN"
```

### 7.4 View invoice (auto-generated after hire completion)
```bash
curl http://localhost:3000/v1/invoices \
  -H "Authorization: Bearer $TOKEN"
```
Save: `INVOICE_ID="cuid..."`

### 7.5 Get invoice detail
```bash
curl http://localhost:3000/v1/invoices/$INVOICE_ID \
  -H "Authorization: Bearer $TOKEN"
```
Expected: Full invoice with subtotal, platformFee (₹99), totalPayable.

### 7.6 Mark invoice as paid
```bash
curl -X POST http://localhost:3000/v1/invoices/$INVOICE_ID/mark-paid \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "paymentMethod": "UPI",
    "paymentReference": "UPI123456789",
    "paymentDate": "2025-12-16"
  }'
```

---

## ✅ Sprint 8 — Admin, Disputes & SEO

### 8.1 Raise a dispute
```bash
curl -X POST http://localhost:3000/v1/hires/$HIRE_ID/disputes \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "PAYMENT_DISPUTE",
    "description": "The employer has not paid the agreed amount after 7 days of job completion. Invoice was marked paid but no money received."
  }'
```
Save: `DISPUTE_ID="cuid..."`

### 8.2 View dispute
```bash
curl http://localhost:3000/v1/disputes/$DISPUTE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 8.3 Admin — platform summary
```bash
# Use the admin user's token
curl http://localhost:3000/v1/admin/reports/summary \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 8.4 Admin — list users
```bash
curl "http://localhost:3000/v1/admin/users?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 8.5 Admin — resolve dispute
```bash
curl -X PATCH http://localhost:3000/v1/disputes/$DISPUTE_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "RESOLVED",
    "resolution": "After reviewing evidence, employer has been instructed to process payment within 48 hours."
  }'
```

### 8.6 Health check
```bash
curl http://localhost:3000/v1/health
```
Expected: `{"status":"ok","db":"ok","redis":"ok","uptime":...}`

---

## ✅ Sprint 9 — Smart Feed & Availability

### 9.1 Get recommended feed (authenticated)
```bash
curl "http://localhost:3000/v1/jobs?lat=23.0225&lng=72.5714&section=recommended" \
  -H "Authorization: Bearer $WORKER_TOKEN"
```
Expected: jobs with `matchScore` field, sorted by score DESC.

### 9.2 Verify feed cache (Redis)
```bash
# Make the same request twice — second should be faster (Redis hit)
curl "http://localhost:3000/v1/jobs?lat=23.0225&lng=72.5714&section=nearby" 

# Check Redis directly
docker exec -it nabora-redis redis-cli KEYS "jobs:feed:*"
# Should show cache entries
```

### 9.3 Set availability
```bash
# Mark next Saturday as unavailable
curl -X POST http://localhost:3000/v1/users/me/availability \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"date": "2025-12-20", "isAvailable": false}'
```

### 9.4 Get availability calendar
```bash
curl "http://localhost:3000/v1/users/me/availability?from=2025-12-01&to=2025-12-31" \
  -H "Authorization: Bearer $WORKER_TOKEN"
```

### 9.5 Get org analytics
```bash
curl http://localhost:3000/v1/organizations/$ORG_ID/analytics \
  -H "Authorization: Bearer $TOKEN"
```
Expected: hireRate, collectionRate, totalBilledAmount, avgWorkerRating, etc.

---

## Swagger UI — All endpoints at a glance

Open **http://localhost:3000/docs** for interactive Swagger documentation.

Click "Authorize" → paste your JWT token → test any endpoint directly from the browser.

---

## Verify the database

```bash
# Connect to Postgres
docker exec -it nabora-postgres psql -U nabora -d nabora

# Useful queries
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Job" WHERE status = 'PUBLISHED';
SELECT COUNT(*) FROM "Hire";
SELECT COUNT(*) FROM "Invoice";
SELECT COUNT(*) FROM "Notification";
SELECT COUNT(*) FROM "AvailabilitySlot";

# Check jobs with PostGIS location_point
SELECT id, title, "locationLat", "locationLng", location_point IS NOT NULL AS has_point
FROM "Job" LIMIT 5;
\q
```

---

## Reset everything (start fresh)

```bash
# Stop and remove Docker volumes
docker compose down -v

# Restart
docker compose up -d
npx prisma db push
docker exec -it nabora-postgres psql -U nabora -d nabora -c "ALTER TABLE \"Job\" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(\"locationLng\",\"locationLat\"),4326)) STORED;"
npm run seed
npm run start:dev
```

---

## Common errors & fixes

| Error | Fix |
|-------|-----|
| `P1001: Can't reach database` | Run `docker compose up -d` and wait 5s |
| `extension "postgis" does not exist` | Use the `postgis/postgis` Docker image (not plain `postgres`) |
| `location_point column does not exist` | Run the `ALTER TABLE` SQL from Step 4 |
| `JWT_SECRET is not defined` | Check `.env` file is in the project root |
| `Bull queue error` | Redis not running — `docker compose up -d redis` |
| `OTP not logged` | Check `SMS_PROVIDER=console` in `.env` |
| `403 Admin access required` | Set `isAdmin = true` in DB for your user (Step 8) |
| `Cannot find module '@prisma/client'` | Run `npx prisma generate` |
