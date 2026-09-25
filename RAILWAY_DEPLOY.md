# Doclix Phase 3 — Railway Production Deploy

You must deploy from **your** Railway account (this environment cannot log into your Railway).

## 1. Create project + Postgres

1. Open https://railway.app → **New Project**
2. **Add PostgreSQL**
3. Copy the Postgres `DATABASE_URL` (public URL with `?sslmode=require`)

## 2. API service

1. **New Service** → **GitHub Repo** (push this project first) **or** empty + upload
2. **Root Directory**: `/` (repo root)
3. **Settings → Build**:
   - Build Command:  
     `npm install && npx prisma generate --schema=prisma/schema.prisma && npm run build --workspace=@legal-doc/api`
4. **Settings → Deploy**:
   - Start Command:  
     `npx prisma migrate deploy --schema=prisma/schema.prisma && npm run start --workspace=@legal-doc/api`
   - Healthcheck Path: `/health`
5. **Variables** (API service):

```
NODE_ENV=production
PORT=4000
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generate-long-random-32+chars>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://YOUR-WEB-SERVICE.up.railway.app
APP_URL=https://YOUR-WEB-SERVICE.up.railway.app
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/tmp/doclix-storage
OCR_PROVIDER=none
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

6. Generate domain → note **API_URL** e.g. `https://doclix-api-production.up.railway.app`

## 3. Web service

1. **New Service** same repo, Root Directory `/`
2. Build Command:  
   `npm install && npm run build --workspace=@legal-doc/web`
3. Start Command:  
   `npm run start --workspace=@legal-doc/web`
4. Healthcheck Path: `/`
5. **Variables** (Web service):

```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://YOUR-API-SERVICE.up.railway.app
API_URL=https://YOUR-API-SERVICE.up.railway.app
NEXT_PUBLIC_APP_URL=https://YOUR-WEB-SERVICE.up.railway.app
```

6. Generate domain for Web

## 4. Cross-link CORS

Set API `CORS_ORIGIN` to the **exact** Web HTTPS URL (no trailing slash mismatch).

## 5. Seed production data (one-time)

Railway API service → shell / one-off:

```
npx prisma db seed --schema=prisma/schema.prisma
```

Or locally with production `DATABASE_URL`:

```
DATABASE_URL="postgresql://..." npx prisma db seed --schema=prisma/schema.prisma
```

## 6. Verify

- `GET https://YOUR-API/health` → `{ "status": "ok", "phase": 3 }`
- Open Web URL on Android Chrome → Register → Templates → Generate PDF

## Ports

Railway injects `PORT`. API reads `process.env.PORT` (default 4000). Web uses `next start -p ${PORT:-3000}`.
