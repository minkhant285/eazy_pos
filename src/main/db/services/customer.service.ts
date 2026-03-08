import { eq,  and, sql } from "drizzle-orm";
import { db } from "../db";
import { customers } from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError, PaginationParams } from "../utils";

// ─── Types ───────────────────────────────────────────────────

export type CreateCustomerInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  creditLimit?: number;
  customerType?: 'retail' | 'wholesale';
};

export type UpdateCustomerInput = Partial<CreateCustomerInput & { isActive: boolean }>;

// ─── CRUD ────────────────────────────────────────────────────

export function createCustomer(input: CreateCustomerInput) {
  if (input.email) {
    const existing = db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, input.email))
      .get();
    if (existing) throw new ValidationError(`Email already in use: ${input.email}`);
  }

  const id = newId();
  db.insert(customers)
    .values({
      id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      taxId: input.taxId ?? null,
      customerType: input.customerType ?? 'retail',
      creditLimit: input.creditLimit ?? 0,
      loyaltyPoints: 0,
      outstandingBalance: 0,
      isActive: true,
    })
    .run();

  return getCustomerById(id);
}

export function getCustomerById(id: string) {
  const row = db.select().from(customers).where(eq(customers.id, id)).get();
  if (!row) throw new NotFoundError("Customer", id);
  return row;
}

export function getCustomerByEmail(email: string) {
  return db.select().from(customers).where(eq(customers.email, email)).get() ?? null;
}

export function getCustomerByPhone(phone: string) {
  return db.select().from(customers).where(eq(customers.phone, phone)).get() ?? null;
}

export function listCustomers(
  params?: PaginationParams & { search?: string; isActive?: boolean; customerType?: 'retail' | 'wholesale' }
) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params?.isActive !== undefined) conditions.push(eq(customers.isActive, params.isActive));
  if (params?.customerType) conditions.push(eq(customers.customerType, params.customerType));
  if (params?.search) {
    conditions.push(
      sql`(${customers.name} LIKE ${"%" + params.search + "%"} OR ${customers.phone} LIKE ${"%" + params.search + "%"} OR ${customers.email} LIKE ${"%" + params.search + "%"})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db.select().from(customers).where(where).limit(pageSize).offset(offset).all();
  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(customers).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export function updateCustomer(id: string, input: UpdateCustomerInput) {
  getCustomerById(id);
  db.update(customers).set({ ...input, updatedAt: now() }).where(eq(customers.id, id)).run();
  return getCustomerById(id);
}

export function deactivateCustomer(id: string) {
  getCustomerById(id);
  db.update(customers).set({ isActive: false, updatedAt: now() }).where(eq(customers.id, id)).run();
}

/** Add loyalty points (e.g. after purchase) */
export function addLoyaltyPoints(customerId: string, points: number) {
  const customer = getCustomerById(customerId);
  const newPoints = customer.loyaltyPoints + points;
  db.update(customers)
    .set({ loyaltyPoints: newPoints, updatedAt: now() })
    .where(eq(customers.id, customerId))
    .run();
  return newPoints;
}

/** Redeem loyalty points (returns new balance) */
export function redeemLoyaltyPoints(customerId: string, points: number) {
  const customer = getCustomerById(customerId);
  if (customer.loyaltyPoints < points) {
    throw new ValidationError(
      `Insufficient loyalty points. Available: ${customer.loyaltyPoints}, Requested: ${points}`
    );
  }
  const newPoints = customer.loyaltyPoints - points;
  db.update(customers)
    .set({ loyaltyPoints: newPoints, updatedAt: now() })
    .where(eq(customers.id, customerId))
    .run();
  return newPoints;
}

/** Update outstanding balance */
export function updateOutstandingBalance(customerId: string, delta: number) {
  const customer = getCustomerById(customerId);
  const newBalance = customer.outstandingBalance + delta;
  if (newBalance > customer.creditLimit && customer.creditLimit > 0) {
    throw new ValidationError(
      `Credit limit exceeded. Limit: ${customer.creditLimit}, Would be: ${newBalance}`
    );
  }
  db.update(customers)
    .set({ outstandingBalance: newBalance, updatedAt: now() })
    .where(eq(customers.id, customerId))
    .run();
  return newBalance;
}
