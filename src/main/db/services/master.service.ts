import { eq, like, and, sql, isNull } from "drizzle-orm";
import { db } from "../db";
import { locations, suppliers, categories, products } from "../schemas/schema";
import { newId, now, NotFoundError, PaginationParams } from "../utils";

// ================================================================
// LOCATIONS
// ================================================================

export type CreateLocationInput = {
  name: string;
  address?: string;
  phone?: string;
};

export type UpdateLocationInput = Partial<CreateLocationInput & { isActive: boolean }>;

export function createLocation(input: CreateLocationInput) {
  const id = newId();
  db.insert(locations).values({ id, ...input }).run();
  return getLocationById(id);
}

export function getLocationById(id: string) {
  const row = db.select().from(locations).where(eq(locations.id, id)).get();
  if (!row) throw new NotFoundError("Location", id);
  return row;
}

export function listLocations(params?: PaginationParams & { isActive?: boolean }) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const where =
    params?.isActive !== undefined ? eq(locations.isActive, params.isActive) : undefined;

  const data = db.select().from(locations).where(where).limit(pageSize).offset(offset).all();
  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(locations).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export function updateLocation(id: string, input: UpdateLocationInput) {
  getLocationById(id);
  db.update(locations).set({ ...input, updatedAt: now() }).where(eq(locations.id, id)).run();
  return getLocationById(id);
}

export function deactivateLocation(id: string) {
  getLocationById(id);
  db.update(locations).set({ isActive: false, updatedAt: now() }).where(eq(locations.id, id)).run();
}

export function setDefaultLocation(id: string) {
  getLocationById(id);
  db.update(locations).set({ isDefault: false, updatedAt: now() }).run();
  db.update(locations).set({ isDefault: true, updatedAt: now() }).where(eq(locations.id, id)).run();
  return getLocationById(id);
}

// ================================================================
// SUPPLIERS
// ================================================================

export type CreateSupplierInput = {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  logoUrl?: string | null;
};

export type UpdateSupplierInput = Partial<CreateSupplierInput & { isActive: boolean }>;

export function createSupplier(input: CreateSupplierInput) {
  const id = newId();
  db.insert(suppliers).values({ id, ...input }).run();
  return getSupplierById(id);
}

export function getSupplierById(id: string) {
  const row = db.select().from(suppliers).where(eq(suppliers.id, id)).get();
  if (!row) throw new NotFoundError("Supplier", id);
  return row;
}

export function listSuppliers(
  params?: PaginationParams & { search?: string; isActive?: boolean }
) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any = [];
  if (params?.isActive !== undefined) conditions.push(eq(suppliers.isActive, params.isActive));
  if (params?.search) conditions.push(like(suppliers.name, `%${params.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db.select().from(suppliers).where(where).limit(pageSize).offset(offset).all();
  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(suppliers).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export function updateSupplier(id: string, input: UpdateSupplierInput) {
  getSupplierById(id);
  db.update(suppliers).set({ ...input, updatedAt: now() }).where(eq(suppliers.id, id)).run();
  return getSupplierById(id);
}

export function deactivateSupplier(id: string) {
  getSupplierById(id);
  db.update(suppliers).set({ isActive: false, updatedAt: now() }).where(eq(suppliers.id, id)).run();
}

// ================================================================
// CATEGORIES
// ================================================================

export type CreateCategoryInput = {
  name: string;
  parentId?: string;
  description?: string;
  skuPrefix?: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export function createCategory(input: CreateCategoryInput) {
  if (input.parentId) {
    const parent = db.select().from(categories).where(eq(categories.id, input.parentId)).get();
    if (!parent) throw new NotFoundError("Parent Category", input.parentId);
  }
  const id = newId();
  db.insert(categories).values({ id, ...input }).run();
  return getCategoryById(id);
}

export function getCategoryById(id: string) {
  const row = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!row) throw new NotFoundError("Category", id);
  return row;
}

export function listCategories(params?: { parentId?: string | null }) {
  if (params?.parentId === null) {
    // Root categories only
    return db.select().from(categories).where(isNull(categories.parentId)).all();
  }
  if (params?.parentId) {
    return db
      .select()
      .from(categories)
      .where(eq(categories.parentId, params.parentId))
      .all();
  }
  return db.select().from(categories).all();
}

/** Get category tree (root → children) */
export function getCategoryTree() {
  const all = db.select().from(categories).all();
  type Cat = typeof all[0] & { children: Cat[] };

  const map = new Map<string, Cat>();
  for (const c of all) map.set(c.id, { ...c, children: [] });

  const roots: Cat[] = [];
  for (const c of map.values()) {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export function updateCategory(id: string, input: UpdateCategoryInput) {
  getCategoryById(id);
  // Prevent circular reference
  if (input.parentId === id) throw new Error("Category cannot be its own parent");
  db.update(categories).set({ ...input, updatedAt: now() }).where(eq(categories.id, id)).run();
  return getCategoryById(id);
}

export function deleteCategory(id: string) {
  getCategoryById(id);
  const children = db.select().from(categories).where(eq(categories.parentId, id)).all();
  if (children.length > 0) throw new Error("Cannot delete category with children");
  db.delete(categories).where(eq(categories.id, id)).run();
}

/** Return the next auto-generated SKU for a category that has a skuPrefix.
 *  Scans existing product SKUs with that prefix and increments the highest number.
 *  e.g. prefix "MCU" + existing MCU0001, MCU0003 → returns "MCU0004"
 */
export function getNextSkuForCategory(categoryId: string): { sku: string; prefix: string } {
  const cat = getCategoryById(categoryId);
  const prefix = (cat.skuPrefix ?? "").toUpperCase().trim();
  if (!prefix) return { sku: "", prefix: "" };

  const existing = db
    .select({ sku: products.sku })
    .from(products)
    .where(sql`UPPER(${products.sku}) LIKE ${prefix + "%"}`)
    .all();

  let maxNum = 0;
  for (const p of existing) {
    const suffix = p.sku.toUpperCase().slice(prefix.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  return { sku: `${prefix}${String(maxNum + 1).padStart(4, "0")}`, prefix };
}
