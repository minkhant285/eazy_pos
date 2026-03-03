import { eq } from "drizzle-orm";
import { db } from "../db";
import { deliveryMethods } from "../schemas/schema";
import { newId, now, NotFoundError } from "../utils";

// ─── Types ───────────────────────────────────────────────────

export type CreateDeliveryMethodInput = {
  provider: string;
  logoUrl?: string | null;
};

export type UpdateDeliveryMethodInput = Partial<CreateDeliveryMethodInput> & {
  isActive?: boolean;
};

// ─── CRUD ────────────────────────────────────────────────────

export function listDeliveryMethods(onlyActive = false) {
  const query = db.select().from(deliveryMethods);
  if (onlyActive) {
    return query.where(eq(deliveryMethods.isActive, true)).all();
  }
  return query.all();
}

export function getDeliveryMethodById(id: string) {
  const row = db
    .select()
    .from(deliveryMethods)
    .where(eq(deliveryMethods.id, id))
    .get();
  if (!row) throw new NotFoundError("DeliveryMethod", id);
  return row;
}

export function createDeliveryMethod(input: CreateDeliveryMethodInput) {
  const id = newId();
  db.insert(deliveryMethods)
    .values({
      id,
      provider: input.provider,
      logoUrl: input.logoUrl ?? null,
    })
    .run();
  return getDeliveryMethodById(id);
}

export function updateDeliveryMethod(id: string, input: UpdateDeliveryMethodInput) {
  const existing = db
    .select()
    .from(deliveryMethods)
    .where(eq(deliveryMethods.id, id))
    .get();
  if (!existing) throw new NotFoundError("DeliveryMethod", id);

  db.update(deliveryMethods)
    .set({
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: now(),
    })
    .where(eq(deliveryMethods.id, id))
    .run();
  return getDeliveryMethodById(id);
}

export function deleteDeliveryMethod(id: string) {
  const existing = db
    .select()
    .from(deliveryMethods)
    .where(eq(deliveryMethods.id, id))
    .get();
  if (!existing) throw new NotFoundError("DeliveryMethod", id);
  db.delete(deliveryMethods).where(eq(deliveryMethods.id, id)).run();
}
