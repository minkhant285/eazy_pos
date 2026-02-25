import { eq, and, desc, gte, lte, like, sql } from "drizzle-orm";
import { db } from "../db";
import { expenseCategories, expenses, locations, users } from "../schemas/schema";
import { newId, now, generateDocNumber, NotFoundError, ValidationError } from "../utils";

// ─── Types ───────────────────────────────────────────────────

export type CreateExpenseCategoryInput = {
  name: string;
  color?: string;
};

export type CreateExpenseInput = {
  categoryId: string;
  locationId?: string;
  amount: number;
  description: string;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "other";
  expenseDate: string;   // YYYY-MM-DD
  notes?: string;
  createdBy?: string;
};

export type ExpenseFilter = {
  categoryId?: string;
  locationId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

// ─── Expense Categories ───────────────────────────────────────

export function listExpenseCategories() {
  return db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.isActive, true))
    .orderBy(expenseCategories.name)
    .all();
}

export function createExpenseCategory(input: CreateExpenseCategoryInput) {
  const existing = db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(eq(expenseCategories.name, input.name))
    .get();
  if (existing) throw new ValidationError(`Category name already exists: ${input.name}`);

  const id = newId();
  db.insert(expenseCategories)
    .values({
      id,
      name: input.name,
      color: input.color ?? "#8b5cf6",
    })
    .run();

  return db.select().from(expenseCategories).where(eq(expenseCategories.id, id)).get()!;
}

export function updateExpenseCategory(
  id: string,
  input: Partial<CreateExpenseCategoryInput>,
) {
  const existing = db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .get();
  if (!existing) throw new NotFoundError("ExpenseCategory", id);

  db.update(expenseCategories)
    .set({ ...input, updatedAt: now() })
    .where(eq(expenseCategories.id, id))
    .run();

  return db.select().from(expenseCategories).where(eq(expenseCategories.id, id)).get()!;
}

export function deleteExpenseCategory(id: string) {
  const existing = db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .get();
  if (!existing) throw new NotFoundError("ExpenseCategory", id);

  const hasExpenses = db
    .select({ c: sql<number>`COUNT(*)` })
    .from(expenses)
    .where(eq(expenses.categoryId, id))
    .get();
  if ((hasExpenses?.c ?? 0) > 0) {
    throw new ValidationError("Cannot delete category that has expenses. Deactivate it instead.");
  }

  // Soft-delete
  db.update(expenseCategories)
    .set({ isActive: false, updatedAt: now() })
    .where(eq(expenseCategories.id, id))
    .run();
}

// ─── Expenses ────────────────────────────────────────────────

export function createExpense(input: CreateExpenseInput) {
  const category = db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.id, input.categoryId), eq(expenseCategories.isActive, true)))
    .get();
  if (!category) throw new NotFoundError("ExpenseCategory", input.categoryId);

  const id = newId();
  const expenseNo = generateDocNumber("EXP");

  db.insert(expenses)
    .values({
      id,
      expenseNo,
      categoryId: input.categoryId,
      locationId: input.locationId ?? null,
      amount: input.amount,
      description: input.description,
      paymentMethod: input.paymentMethod ?? "cash",
      expenseDate: input.expenseDate,
      notes: input.notes ?? null,
      createdBy: input.createdBy ?? null,
    })
    .run();

  return getExpenseById(id);
}

export function getExpenseById(id: string) {
  const row = db
    .select({
      id: expenses.id,
      expenseNo: expenses.expenseNo,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      locationId: expenses.locationId,
      locationName: locations.name,
      amount: expenses.amount,
      description: expenses.description,
      paymentMethod: expenses.paymentMethod,
      expenseDate: expenses.expenseDate,
      notes: expenses.notes,
      createdBy: expenses.createdBy,
      createdByName: users.name,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .leftJoin(locations, eq(expenses.locationId, locations.id))
    .leftJoin(users, eq(expenses.createdBy, users.id))
    .where(eq(expenses.id, id))
    .get();

  if (!row) throw new NotFoundError("Expense", id);
  return row;
}

export function listExpenses(params?: ExpenseFilter) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (params?.categoryId) conditions.push(eq(expenses.categoryId, params.categoryId));
  if (params?.locationId) conditions.push(eq(expenses.locationId, params.locationId));
  if (params?.fromDate) conditions.push(gte(expenses.expenseDate, params.fromDate));
  if (params?.toDate) conditions.push(lte(expenses.expenseDate, params.toDate));
  if (params?.search) conditions.push(like(expenses.description, `%${params.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: expenses.id,
      expenseNo: expenses.expenseNo,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      locationName: locations.name,
      amount: expenses.amount,
      description: expenses.description,
      paymentMethod: expenses.paymentMethod,
      expenseDate: expenses.expenseDate,
      notes: expenses.notes,
      createdByName: users.name,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .leftJoin(locations, eq(expenses.locationId, locations.id))
    .leftJoin(users, eq(expenses.createdBy, users.id))
    .where(where)
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(expenses).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export function updateExpense(id: string, input: Partial<CreateExpenseInput>) {
  const existing = db.select().from(expenses).where(eq(expenses.id, id)).get();
  if (!existing) throw new NotFoundError("Expense", id);

  if (input.categoryId) {
    const cat = db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.id, input.categoryId))
      .get();
    if (!cat) throw new NotFoundError("ExpenseCategory", input.categoryId);
  }

  db.update(expenses)
    .set({ ...input, updatedAt: now() })
    .where(eq(expenses.id, id))
    .run();

  return getExpenseById(id);
}

export function deleteExpense(id: string) {
  const existing = db.select().from(expenses).where(eq(expenses.id, id)).get();
  if (!existing) throw new NotFoundError("Expense", id);
  db.delete(expenses).where(eq(expenses.id, id)).run();
}

/** Summary: total amount + count per category for a date range */
export function getExpenseSummary(params: {
  fromDate: string;
  toDate: string;
  locationId?: string;
}) {
  const conditions: any[] = [
    gte(expenses.expenseDate, params.fromDate),
    lte(expenses.expenseDate, params.toDate),
  ];
  if (params.locationId) conditions.push(eq(expenses.locationId, params.locationId));

  return db
    .select({
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      totalAmount: sql<number>`SUM(${expenses.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(and(...conditions))
    .groupBy(expenses.categoryId)
    .orderBy(sql`SUM(${expenses.amount}) DESC`)
    .all();
}
