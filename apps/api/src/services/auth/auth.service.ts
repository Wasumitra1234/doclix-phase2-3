import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { Role } from "@prisma/client";
import type { AuthUser } from "../../types/express";

const SALT_ROUNDS = 12;

export interface RegisterInput {
  tenantName: string;
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const slugBase = input.tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.tenantName,
        slug,
        email: input.email.toLowerCase(),
        phone: input.phone,
        isActive: true,
        settings: { defaultLanguage: "EN" },
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: Role.VENDOR_ADMIN,
        isActive: true,
      },
    });

    // Attach free trial on Starter plan if available
    const starter = await tx.plan.findUnique({ where: { code: "STARTER" } });
    if (starter) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 14);
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: starter.id,
          status: "TRIALING",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEndsAt: trialEnd,
        },
      });
    }

    return { tenant, user };
  });

  const authUser: AuthUser = {
    id: result.user.id,
    tenantId: result.tenant.id,
    email: result.user.email,
    role: result.user.role,
    firstName: result.user.firstName,
  };

  const token = signToken(authUser);

  return {
    token,
    user: {
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: result.user.lastName,
      role: authUser.role,
      tenantId: authUser.tenantId,
      tenantName: result.tenant.name,
    },
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), isActive: true },
    include: { tenant: true },
  });

  if (!user || !user.passwordHash) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  if (!user.tenant.isActive) {
    throw Object.assign(new Error("Account is disabled"), { status: 403 });
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const authUser: AuthUser = {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
  };

  const token = signToken(authUser);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
    },
  };
}

export function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    return {
      id: payload.sub as string,
      tenantId: payload.tenantId as string,
      email: payload.email as string,
      role: payload.role as Role,
      firstName: payload.firstName as string,
    };
  } catch {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: {
        include: {
          subscriptions: {
            where: { status: { in: ["TRIALING", "ACTIVE"] } },
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  const sub = user.tenant.subscriptions[0] || null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    tenantId: user.tenantId,
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
    },
    subscription: sub
      ? {
          status: sub.status,
          periodEnd: sub.currentPeriodEnd,
          plan: {
            code: sub.plan.code,
            name: sub.plan.name,
            documentsLimit: sub.plan.documentsLimit,
          },
        }
      : null,
  };
}
