import { eq } from "drizzle-orm";
import { db } from "../db";
import { brands } from "../schemas/schema";
import { newId, now, NotFoundError } from "../utils";

// ─── Types ───────────────────────────────────────────────────

export type CreateBrandInput = {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
};

export type UpdateBrandInput = Partial<CreateBrandInput> & {
  isActive?: boolean;
};

// ─── CRUD ────────────────────────────────────────────────────

export function listBrands(onlyActive = false) {
  const query = db.select().from(brands);
  if (onlyActive) {
    return query.where(eq(brands.isActive, true)).orderBy(brands.name).all();
  }
  return query.orderBy(brands.name).all();
}

export function getBrandById(id: string) {
  const row = db.select().from(brands).where(eq(brands.id, id)).get();
  if (!row) throw new NotFoundError("Brand", id);
  return row;
}

export function createBrand(input: CreateBrandInput) {
  const id = newId();
  db.insert(brands)
    .values({
      id,
      name: input.name,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
    })
    .run();
  return getBrandById(id);
}

export function updateBrand(id: string, input: UpdateBrandInput) {
  const existing = db.select().from(brands).where(eq(brands.id, id)).get();
  if (!existing) throw new NotFoundError("Brand", id);

  db.update(brands)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: now(),
    })
    .where(eq(brands.id, id))
    .run();
  return getBrandById(id);
}

export function deleteBrand(id: string) {
  const existing = db.select().from(brands).where(eq(brands.id, id)).get();
  if (!existing) throw new NotFoundError("Brand", id);
  db.delete(brands).where(eq(brands.id, id)).run();
}
