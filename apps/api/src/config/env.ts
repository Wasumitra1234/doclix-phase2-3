import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-in-production-min-32-chars",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  APP_URL: process.env.APP_URL || "http://localhost:3000",

  // Storage
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || "local") as "local" | "s3" | "r2",
  STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH || "./storage",
  S3_BUCKET: process.env.S3_BUCKET || process.env.R2_BUCKET || "",
  AWS_REGION: process.env.AWS_REGION || "ap-south-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "",

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",

  // OCR (Phase 3 ready)
  OCR_PROVIDER: process.env.OCR_PROVIDER || "none",
};
