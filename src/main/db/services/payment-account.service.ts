import { eq } from "drizzle-orm";
import { db } from "../db";
import { paymentAccounts } from "../schemas/schema";
import { newId, now, NotFoundError } from "../utils";

// ─── Types ───────────────────────────────────────────────────

export type CreatePaymentAccountInput = {
  provider: string;
  accountNumber: string;
  accountName: string;
  providerLogo?: string | null;
  qrCode?: string | null;
};

export type UpdatePaymentAccountInput = Partial<CreatePaymentAccountInput> & {
  isActive?: boolean;
};

// ─── CRUD ────────────────────────────────────────────────────

export function listPaymentAccounts(onlyActive = false) {
  const query = db.select().from(paymentAccounts);
  if (onlyActive) {
    return query.where(eq(paymentAccounts.isActive, true)).all();
  }
  return query.all();
}

export function getPaymentAccountById(id: string) {
  const row = db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.id, id))
    .get();
  if (!row) throw new NotFoundError("PaymentAccount", id);
  return row;
}

export function createPaymentAccount(input: CreatePaymentAccountInput) {
  const id = newId();
  db.insert(paymentAccounts)
    .values({
      id,
      provider: input.provider,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      providerLogo: input.providerLogo ?? null,
      qrCode: input.qrCode ?? null,
    })
    .run();
  return getPaymentAccountById(id);
}

export function updatePaymentAccount(id: string, input: UpdatePaymentAccountInput) {
  const existing = db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.id, id))
    .get();
  if (!existing) throw new NotFoundError("PaymentAccount", id);

  db.update(paymentAccounts)
    .set({
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.accountNumber !== undefined && { accountNumber: input.accountNumber }),
      ...(input.accountName !== undefined && { accountName: input.accountName }),
      ...(input.providerLogo !== undefined && { providerLogo: input.providerLogo }),
      ...(input.qrCode !== undefined && { qrCode: input.qrCode }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: now(),
    })
    .where(eq(paymentAccounts.id, id))
    .run();
  return getPaymentAccountById(id);
}

export function deletePaymentAccount(id: string) {
  const existing = db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.id, id))
    .get();
  if (!existing) throw new NotFoundError("PaymentAccount", id);
  db.delete(paymentAccounts).where(eq(paymentAccounts.id, id)).run();
}
