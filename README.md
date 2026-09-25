# Doclix — Phase 3

Cloud-hosted, mobile-first Legal Document Automation for Indian stamp vendors, advocates & typists.

## Phase 3 features

- ✅ Server-side **A4 PDF** generation (PDFKit) with stamp-paper top clearance margins
- ✅ **Generate & Download PDF** from phone (Android share-ready download)
- ✅ **Camera / Gallery upload** (multipart, images + PDF)
- ✅ OCR service **integration-ready** (`OCR_PROVIDER=none` until credentials set)
- ✅ **Cloud storage** abstraction (local → R2/S3)
- ✅ **Razorpay** create-order, verify, webhook **idempotency**
- ✅ Usage ledger on PDF generation + plan limits
- ✅ Mobile UI: live preview, attachments, sticky Generate button

## Run locally (developers only)

```bash
cp .env.example .env
npm install
npx prisma generate --schema=prisma/schema.prisma
npx prisma migrate dev --schema=prisma/schema.prisma
npx prisma db seed
npm run dev:api   # :4000
npm run dev:web   # :3000
```

## Production (phone-only)

1. Neon/Supabase Postgres → `DATABASE_URL`
2. Deploy `apps/api` → Railway/Render (env: DB, JWT, CORS, Razorpay, storage)
3. Deploy `apps/web` → Vercel (`NEXT_PUBLIC_API_URL`)
4. `prisma migrate deploy` + seed on production DB
5. Open HTTPS URL on Android Chrome — full flow without laptop

## API (Phase 3)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/documents/:id/generate-pdf` | Server PDF + usage |
| GET | `/api/documents/:id/files/:fileId/download` | PDF download |
| POST | `/api/uploads` | multipart `file`, optional `ocr=true` |
| GET/POST | `/api/subscriptions/*` | plans, order, verify |
| POST | `/api/webhooks/razorpay` | Idempotent webhook |
