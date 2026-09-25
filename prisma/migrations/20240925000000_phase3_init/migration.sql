-- Doclix Phase 3 baseline migration
-- Generated to match prisma/schema.prisma (Phase 1–3 models)

CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'VENDOR_ADMIN', 'ADVOCATE', 'LEGAL_TYPIST', 'STAFF');
CREATE TYPE "PlanInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'PAUSED');
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'FINALIZED', 'ARCHIVED', 'DELETED');
CREATE TYPE "UploadPurpose" AS ENUM ('AADHAAR', 'PAN', 'PROPERTY_DOC', 'IDENTITY', 'ADDRESS_PROOF', 'OTHER', 'GENERATED_PDF', 'STAMP_PAPER_SCAN');
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DELETED');
CREATE TYPE "Language" AS ENUM ('EN', 'HI', 'TA', 'TE', 'KN', 'ML', 'MR', 'GU', 'BN', 'PA', 'OR');
CREATE TYPE "IndianState" AS ENUM ('AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DN', 'DL', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LA', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OR', 'PY', 'PB', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'WB', 'ALL');
CREATE TYPE "UsageMetric" AS ENUM ('DOCUMENTS_GENERATED', 'OCR_PAGES', 'AI_TOKENS', 'STORAGE_MB', 'TEMPLATE_DOWNLOADS');
CREATE TYPE "WebhookProvider" AS ENUM ('RAZORPAY', 'STRIPE', 'INTERNAL');
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" "IndianState",
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'LEGAL_TYPIST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "phoneVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "interval" "PlanInterval" NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "documentsLimit" INTEGER NOT NULL,
    "storageLimitMb" INTEGER NOT NULL,
    "ocrPagesLimit" INTEGER NOT NULL DEFAULT 0,
    "aiTokensLimit" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "razorpayPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "razorpaySubscriptionId" TEXT,
    "razorpayCustomerId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_ledgers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "userId" TEXT,
    "metric" "UsageMetric" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_schemas" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "jsonSchema" JSONB NOT NULL,
    "uiSchema" JSONB,
    "fieldMeta" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_schemas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "state" "IndianState" NOT NULL DEFAULT 'ALL',
    "language" "Language" NOT NULL DEFAULT 'EN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "pageSize" TEXT NOT NULL DEFAULT 'A4',
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "marginTopMm" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "marginBottomMm" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "marginLeftMm" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "marginRightMm" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "stampPaperTopClearanceMm" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "defaultFontFamily" TEXT NOT NULL DEFAULT 'Times New Roman',
    "defaultFontSizePt" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "headingFontFamily" TEXT,
    "headingFontSizePt" DOUBLE PRECISION,
    "bodyContent" TEXT NOT NULL,
    "clauseRefs" JSONB,
    "headerContent" TEXT,
    "footerContent" TEXT,
    "formSchemaId" TEXT,
    "snapshot" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "formData" JSONB NOT NULL,
    "extractedData" JSONB,
    "language" "Language",
    "state" "IndianState",
    "deletedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "documentId" TEXT,
    "purpose" "UploadPurpose" NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "bucket" TEXT,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "ocrText" TEXT,
    "ocrData" JSONB,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "pageCount" INTEGER,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "generated_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "bucket" TEXT,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "templateVersionId" TEXT,
    "pageCount" INTEGER,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL DEFAULT 'RAZORPAY',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "subscriptionId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");
CREATE INDEX "tenants_isActive_idx" ON "tenants"("isActive");

CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE INDEX "plans_isActive_sortOrder_idx" ON "plans"("isActive", "sortOrder");

CREATE UNIQUE INDEX "subscriptions_razorpaySubscriptionId_key" ON "subscriptions"("razorpaySubscriptionId");
CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");

CREATE INDEX "usage_ledgers_tenantId_metric_periodStart_periodEnd_idx" ON "usage_ledgers"("tenantId", "metric", "periodStart", "periodEnd");
CREATE INDEX "usage_ledgers_subscriptionId_idx" ON "usage_ledgers"("subscriptionId");
CREATE INDEX "usage_ledgers_referenceType_referenceId_idx" ON "usage_ledgers"("referenceType", "referenceId");

CREATE UNIQUE INDEX "templates_currentVersionId_key" ON "templates"("currentVersionId");
CREATE UNIQUE INDEX "templates_tenantId_code_state_language_key" ON "templates"("tenantId", "code", "state", "language");
CREATE INDEX "templates_tenantId_idx" ON "templates"("tenantId");
CREATE INDEX "templates_code_idx" ON "templates"("code");
CREATE INDEX "templates_state_language_idx" ON "templates"("state", "language");
CREATE INDEX "templates_isActive_isSystem_idx" ON "templates"("isActive", "isSystem");

CREATE UNIQUE INDEX "template_versions_formSchemaId_key" ON "template_versions"("formSchemaId");
CREATE UNIQUE INDEX "template_versions_templateId_version_key" ON "template_versions"("templateId", "version");
CREATE INDEX "template_versions_templateId_idx" ON "template_versions"("templateId");
CREATE INDEX "template_versions_isPublished_idx" ON "template_versions"("isPublished");

CREATE INDEX "saved_documents_tenantId_idx" ON "saved_documents"("tenantId");
CREATE INDEX "saved_documents_userId_idx" ON "saved_documents"("userId");
CREATE INDEX "saved_documents_templateId_idx" ON "saved_documents"("templateId");
CREATE INDEX "saved_documents_templateVersionId_idx" ON "saved_documents"("templateVersionId");
CREATE INDEX "saved_documents_status_idx" ON "saved_documents"("status");
CREATE INDEX "saved_documents_tenantId_status_createdAt_idx" ON "saved_documents"("tenantId", "status", "createdAt");

CREATE INDEX "document_logs_documentId_createdAt_idx" ON "document_logs"("documentId", "createdAt");
CREATE INDEX "document_logs_tenantId_createdAt_idx" ON "document_logs"("tenantId", "createdAt");
CREATE INDEX "document_logs_userId_idx" ON "document_logs"("userId");

CREATE INDEX "uploads_tenantId_idx" ON "uploads"("tenantId");
CREATE INDEX "uploads_documentId_idx" ON "uploads"("documentId");
CREATE INDEX "uploads_purpose_status_idx" ON "uploads"("purpose", "status");
CREATE INDEX "uploads_objectKey_idx" ON "uploads"("objectKey");

CREATE INDEX "generated_files_tenantId_idx" ON "generated_files"("tenantId");
CREATE INDEX "generated_files_documentId_idx" ON "generated_files"("documentId");
CREATE INDEX "generated_files_objectKey_idx" ON "generated_files"("objectKey");

CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events"("provider", "eventId");
CREATE INDEX "webhook_events_status_createdAt_idx" ON "webhook_events"("status", "createdAt");
CREATE INDEX "webhook_events_eventType_idx" ON "webhook_events"("eventType");
CREATE INDEX "webhook_events_tenantId_idx" ON "webhook_events"("tenantId");

CREATE INDEX "outbox_events_processed_createdAt_idx" ON "outbox_events"("processed", "createdAt");

ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_ledgers" ADD CONSTRAINT "usage_ledgers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_ledgers" ADD CONSTRAINT "usage_ledgers_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usage_ledgers" ADD CONSTRAINT "usage_ledgers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "templates" ADD CONSTRAINT "templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates" ADD CONSTRAINT "templates_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_formSchemaId_fkey" FOREIGN KEY ("formSchemaId") REFERENCES "form_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_documents" ADD CONSTRAINT "saved_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_documents" ADD CONSTRAINT "saved_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "saved_documents" ADD CONSTRAINT "saved_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "saved_documents" ADD CONSTRAINT "saved_documents_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "saved_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "saved_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "saved_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
