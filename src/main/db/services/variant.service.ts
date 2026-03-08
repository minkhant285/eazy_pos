import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  variantAttributes,
  variantOptions,
  productVariants,
  productVariantOptions,
  variantStock,
  products,
} from "../schemas/schema";
import { newId, now, NotFoundError, InsufficientStockError } from "../utils";

// ─── Attributes ───────────────────────────────────────────────

export function getAttributesWithOptions(productId: string) {
  const attrs = db
    .select()
    .from(variantAttributes)
    .where(eq(variantAttributes.productId, productId))
    .all();

  return attrs.map((attr) => {
    const options = db
      .select()
      .from(variantOptions)
      .where(eq(variantOptions.attributeId, attr.id))
      .orderBy(variantOptions.sortOrder)
      .all();
    return { ...attr, options };
  });
}

export function createAttribute(productId: string, name: string) {
  const id = newId();
  db.insert(variantAttributes).values({ id, productId, name }).run();
  return db.select().from(variantAttributes).where(eq(variantAttributes.id, id)).get()!;
}

export function deleteAttribute(id: string) {
  db.delete(variantAttributes).where(eq(variantAttributes.id, id)).run();
}

export function addOption(attributeId: string, value: string, sortOrder = 0) {
  const id = newId();
  db.insert(variantOptions).values({ id, attributeId, value, sortOrder }).run();
  return db.select().from(variantOptions).where(eq(variantOptions.id, id)).get()!;
}

export function removeOption(id: string) {
  db.delete(variantOptions).where(eq(variantOptions.id, id)).run();
}

// ─── Variants ─────────────────────────────────────────────────

/** Compute cartesian product of arrays */
function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
    [[]]
  );
}

export function generateVariants(productId: string) {
  const attrs = getAttributesWithOptions(productId);
  const filledAttrs = attrs.filter((a) => a.options.length > 0);
  if (filledAttrs.length === 0) return [];

  const parent = db.select().from(products).where(eq(products.id, productId)).get();
  if (!parent) throw new NotFoundError("Product", productId);

  // Gather existing variants and their option combos to avoid duplicates
  const existingVariants = db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .all();

  const existingOptionSets = existingVariants.map((v) => {
    return db
      .select({ optionId: productVariantOptions.optionId })
      .from(productVariantOptions)
      .where(eq(productVariantOptions.variantId, v.id))
      .all()
      .map((o) => o.optionId)
      .sort()
      .join(",");
  });

  const optionIdArrays = filledAttrs.map((a) => a.options.map((o) => o.id));
  const combos = cartesian(optionIdArrays);
  let nextN = existingVariants.length + 1;
  const created: { id: string; sku: string }[] = [];

  for (const combo of combos) {
    const key = [...combo].sort().join(",");
    if (existingOptionSets.includes(key)) continue;

    const variantId = newId();
    const sku = `${parent.sku}-V${nextN}`;
    nextN++;

    db.insert(productVariants)
      .values({
        id: variantId,
        productId,
        sku,
        costPrice: parent.costPrice,
        sellingPrice: parent.sellingPrice,
        isActive: true,
      })
      .run();

    for (const optionId of combo) {
      db.insert(productVariantOptions).values({ id: newId(), variantId, optionId }).run();
    }

    created.push({ id: variantId, sku });
  }

  return created;
}

export function listVariants(productId: string) {
  const variants = db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .all();

  return variants.map((v) => {
    const opts = db
      .select({ value: variantOptions.value, attrName: variantAttributes.name })
      .from(productVariantOptions)
      .innerJoin(variantOptions, eq(productVariantOptions.optionId, variantOptions.id))
      .innerJoin(variantAttributes, eq(variantOptions.attributeId, variantAttributes.id))
      .where(eq(productVariantOptions.variantId, v.id))
      .all();
    const optionLabel = opts.map((o) => `${o.attrName}: ${o.value}`).join(" / ");
    return { ...v, optionLabel };
  });
}

export function updateVariant(
  id: string,
  data: {
    sku?: string;
    barcode?: string | null;
    costPrice?: number;
    sellingPrice?: number;
    wholesalePrice?: number | null;
    imageUrl?: string | null;
    isActive?: boolean;
  }
) {
  db.update(productVariants)
    .set({ ...data, updatedAt: now() })
    .where(eq(productVariants.id, id))
    .run();
  return db.select().from(productVariants).where(eq(productVariants.id, id)).get()!;
}

/** For POS variant picker: returns attributes with options + active variants with their optionIds */
export function getPickerData(productId: string) {
  const attributes = getAttributesWithOptions(productId);

  const variants = db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
    .all();

  const variantsWithOptions = variants.map((v) => {
    const optionIds = db
      .select({ optionId: productVariantOptions.optionId })
      .from(productVariantOptions)
      .where(eq(productVariantOptions.variantId, v.id))
      .all()
      .map((o) => o.optionId);

    const opts = db
      .select({ value: variantOptions.value })
      .from(productVariantOptions)
      .innerJoin(variantOptions, eq(productVariantOptions.optionId, variantOptions.id))
      .where(eq(productVariantOptions.variantId, v.id))
      .all();

    const label = opts.map((o) => o.value).join(" / ");
    return { ...v, optionIds, label };
  });

  return { attributes, variants: variantsWithOptions };
}

// ─── Variant Stock ────────────────────────────────────────────

export function upsertVariantStock(
  variantId: string,
  locationId: string,
  delta: number
): { qtyBefore: number; qtyAfter: number } {
  const existing = db
    .select()
    .from(variantStock)
    .where(and(eq(variantStock.variantId, variantId), eq(variantStock.locationId, locationId)))
    .get();

  const qtyBefore = existing?.qtyOnHand ?? 0;
  const qtyAfter = qtyBefore + delta;

  if (qtyAfter < 0) {
    throw new InsufficientStockError(variantId, qtyBefore, Math.abs(delta));
  }

  if (existing) {
    db.update(variantStock)
      .set({ qtyOnHand: qtyAfter, updatedAt: now() })
      .where(and(eq(variantStock.variantId, variantId), eq(variantStock.locationId, locationId)))
      .run();
  } else {
    db.insert(variantStock)
      .values({ id: newId(), variantId, locationId, qtyOnHand: qtyAfter, qtyReserved: 0 })
      .run();
  }

  return { qtyBefore, qtyAfter };
}

export function setVariantStockQty(
  variantId: string,
  locationId: string,
  qty: number
) {
  const existing = db
    .select()
    .from(variantStock)
    .where(and(eq(variantStock.variantId, variantId), eq(variantStock.locationId, locationId)))
    .get();

  if (existing) {
    db.update(variantStock)
      .set({ qtyOnHand: qty, updatedAt: now() })
      .where(and(eq(variantStock.variantId, variantId), eq(variantStock.locationId, locationId)))
      .run();
  } else {
    db.insert(variantStock)
      .values({ id: newId(), variantId, locationId, qtyOnHand: qty, qtyReserved: 0 })
      .run();
  }

  return { qtyAfter: qty };
}

export function getVariantStockForLocation(variantId: string, locationId: string) {
  return (
    db
      .select()
      .from(variantStock)
      .where(and(eq(variantStock.variantId, variantId), eq(variantStock.locationId, locationId)))
      .get() ?? null
  );
}

/** List variants with their stock qty at a specific location — used by Stock page */
export function listVariantsWithStock(productId: string, locationId: string) {
  const variants = listVariants(productId);
  return variants.map((v) => {
    const stock = getVariantStockForLocation(v.id, locationId);
    return {
      ...v,
      qtyOnHand: stock?.qtyOnHand ?? 0,
      qtyAvailable: stock?.qtyAvailable ?? 0,
      hasStockRecord: !!stock,
    };
  });
}
