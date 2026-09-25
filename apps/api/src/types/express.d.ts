import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  firstName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
