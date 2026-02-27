import { eq } from "drizzle-orm";
import { db } from "../db";
import { customerAddresses } from "../schemas/schema";
import { newId, now, NotFoundError } from "../utils";

// ─── Types ───────────────────────────────────────────────────

export type CreateAddressInput = {
  receiverName: string;
  phoneNumber: string;
  detailAddress: string;
};

export type UpdateAddressInput = Partial<CreateAddressInput>;

// ─── Service functions ────────────────────────────────────────

export function listAddresses(customerId: string) {
  return db
    .select()
    .from(customerAddresses)
    .where(eq(customerAddresses.customerId, customerId))
    .all();
}

export function createAddress(customerId: string, input: CreateAddressInput) {
  const existing = listAddresses(customerId);
  const id = newId();
  db.insert(customerAddresses).values({
    id,
    customerId,
    receiverName: input.receiverName,
    phoneNumber: input.phoneNumber,
    detailAddress: input.detailAddress,
    isDefault: existing.length === 0, // first address auto-becomes default
  }).run();
  return db.select().from(customerAddresses).where(eq(customerAddresses.id, id)).get()!;
}

export function updateAddress(id: string, input: UpdateAddressInput) {
  const existing = db.select().from(customerAddresses).where(eq(customerAddresses.id, id)).get();
  if (!existing) throw new NotFoundError("Address not found");
  db.update(customerAddresses).set({
    ...(input.receiverName  !== undefined ? { receiverName:  input.receiverName  } : {}),
    ...(input.phoneNumber   !== undefined ? { phoneNumber:   input.phoneNumber   } : {}),
    ...(input.detailAddress !== undefined ? { detailAddress: input.detailAddress } : {}),
    updatedAt: now(),
  }).where(eq(customerAddresses.id, id)).run();
  return db.select().from(customerAddresses).where(eq(customerAddresses.id, id)).get()!;
}

export function deleteAddress(id: string) {
  const existing = db.select().from(customerAddresses).where(eq(customerAddresses.id, id)).get();
  if (!existing) throw new NotFoundError("Address not found");
  db.delete(customerAddresses).where(eq(customerAddresses.id, id)).run();
  // Promote another address to default if the deleted one was default
  if (existing.isDefault) {
    const next = db.select().from(customerAddresses)
      .where(eq(customerAddresses.customerId, existing.customerId))
      .limit(1)
      .all();
    if (next.length > 0) {
      db.update(customerAddresses)
        .set({ isDefault: true, updatedAt: now() })
        .where(eq(customerAddresses.id, next[0].id))
        .run();
    }
  }
  return { success: true };
}

export function setDefault(id: string, customerId: string) {
  db.update(customerAddresses)
    .set({ isDefault: false, updatedAt: now() })
    .where(eq(customerAddresses.customerId, customerId))
    .run();
  db.update(customerAddresses)
    .set({ isDefault: true, updatedAt: now() })
    .where(eq(customerAddresses.id, id))
    .run();
  return { success: true };
}
