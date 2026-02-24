import { eq, like, and, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError, PaginationParams } from "../utils";
import * as crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────
export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "manager" | "cashier";
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: "admin" | "manager" | "cashier";
  isActive?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
  // NOTE: In production use bcrypt or argon2
}

// ─── CRUD ────────────────────────────────────────────────────

/** Create a new user */
export async function createUser(input: CreateUserInput) {
  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .get();

  if (existing) throw new ValidationError(`Email already in use: ${input.email}`);

  const id = newId();
  db.insert(users)
    .values({
      id,
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role ?? "cashier",
      isActive: true,
    })
    .run();

  return getUserById(id);
}

/** Get user by ID */
export function getUserById(id: string) {
  const user = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!user) throw new NotFoundError("User", id);
  return user;
}

/** Get user by email (for login) */
export function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get() ?? null;
}

/** Verify password for login */
export function verifyPassword(email: string, password: string) {
  const user = getUserByEmail(email);
  if (!user || !user.isActive) return null;
  if (user.passwordHash !== hashPassword(password)) return null;
  const { passwordHash: _, ...safe } = user;
  return safe;
}

/** List users with optional filters */
export function listUsers(
  params?: PaginationParams & { role?: string; search?: string; isActive?: boolean }
) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params?.role) conditions.push(eq(users.role, params.role as any));
  if (params?.isActive !== undefined) conditions.push(eq(users.isActive, params.isActive));
  if (params?.search) conditions.push(like(users.name, `%${params.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(where)
      .get()?.count ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Update a user */
export async function updateUser(id: string, input: UpdateUserInput) {
  getUserById(id); // throws if not found

  db.update(users)
    .set({ ...input, updatedAt: now() })
    .where(eq(users.id, id))
    .run();

  return getUserById(id);
}

/** Change user password */
export function changePassword(id: string, newPassword: string) {
  getUserById(id); // throws if not found
  db.update(users)
    .set({ passwordHash: hashPassword(newPassword), updatedAt: now() })
    .where(eq(users.id, id))
    .run();
}

/** Soft-delete (deactivate) user */
export function deactivateUser(id: string) {
  getUserById(id);
  db.update(users).set({ isActive: false, updatedAt: now() }).where(eq(users.id, id)).run();
}

/** Reactivate user */
export function activateUser(id: string) {
  getUserById(id);
  db.update(users).set({ isActive: true, updatedAt: now() }).where(eq(users.id, id)).run();
}
