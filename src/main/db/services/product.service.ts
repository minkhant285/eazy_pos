import { eq, like, and, sql, or } from "drizzle-orm";
import { db } from "../db";
import { products, productPriceHistory, categories, stock, stockLedger, saleItems } from "../schemas/schema";
import { newId, now, NotFoundError, ValidationError, PaginationParams } from "../utils";

// ─── Types ───────────────────────────────────────────────────

export type CreateProductInput = {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  unitOfMeasure?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate?: number;
  reorderPoint?: number;
  reorderQty?: number;
  isSerialized?: boolean;
  imageUrl?: string;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, "sku">>;

export type ProductFilter = PaginationParams & {
  search?: string;        // name, sku, barcode
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;     // qty_on_hand <= reorder_point
  locationId?: string;   // required if lowStock=true
};

// ─── CRUD ────────────────────────────────────────────────────

/** Create a product */
export function createProduct(input: CreateProductInput) {
  // Check SKU uniqueness
  const existing = db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, input.sku))
    .get();
  if (existing) throw new ValidationError(`SKU already exists: ${input.sku}`);

  if (input.barcode) {
    const barcodeExists = db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.barcode, input.barcode))
      .get();
    if (barcodeExists) throw new ValidationError(`Barcode already exists: ${input.barcode}`);
  }

  const id = newId();
  db.insert(products)
    .values({
      id,
      sku: input.sku,
      barcode: input.barcode ?? null,
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      unitOfMeasure: input.unitOfMeasure ?? "pcs",
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      taxRate: input.taxRate ?? 0,
      reorderPoint: input.reorderPoint ?? 0,
      reorderQty: input.reorderQty ?? 0,
      isSerialized: input.isSerialized ?? false,
      imageUrl: input.imageUrl ?? null,
      isActive: true,
    })
    .run();

  return getProductById(id);
}

/** Get product by ID */
export function getProductById(id: string) {
  const row = db
    .select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unitOfMeasure: products.unitOfMeasure,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      taxRate: products.taxRate,
      reorderPoint: products.reorderPoint,
      reorderQty: products.reorderQty,
      isActive: products.isActive,
      isSerialized: products.isSerialized,
      imageUrl: products.imageUrl,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .get();

  if (!row) throw new NotFoundError("Product", id);
  return row;
}

/** Get product by SKU */
export function getProductBySku(sku: string) {
  const row = db.select().from(products).where(eq(products.sku, sku)).get();
  if (!row) throw new NotFoundError("Product (SKU)", sku);
  return row;
}

/** Get product by barcode */
export function getProductByBarcode(barcode: string) {
  const row = db.select().from(products).where(eq(products.barcode, barcode)).get();
  if (!row) throw new NotFoundError("Product (Barcode)", barcode);
  return row;
}

/** List products with filters and pagination */
export function listProducts(params?: ProductFilter) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions:any[] = [];
  if (params?.isActive !== undefined) conditions.push(eq(products.isActive, params.isActive));
  if (params?.categoryId) conditions.push(eq(products.categoryId, params.categoryId));
  if (params?.search) {
    conditions.push(
      or(
        like(products.name, `%${params.search}%`),
        like(products.sku, `%${params.search}%`),
        like(products.barcode, `%${params.search}%`)
      )
    );
  }
  if (params?.lowStock && params?.locationId) {
    // Join stock and filter where qtyOnHand <= reorderPoint
    const lowStockProductIds = db
      .select({ productId: stock.productId })
      .from(stock)
      .where(
        and(
          eq(stock.locationId, params.locationId),
          sql`${stock.qtyOnHand} <= ${products.reorderPoint}`
        )
      )
      .all()
      .map((r) => r.productId);

    if (lowStockProductIds.length === 0) {
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }
    conditions.push(sql`${products.id} IN (${sql.join(lowStockProductIds.map(id => sql`${id}`), sql`, `)})`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unitOfMeasure: products.unitOfMeasure,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      taxRate: products.taxRate,
      reorderPoint: products.reorderPoint,
      isActive: products.isActive,
      imageUrl: products.imageUrl,
      hasVariants: sql<number>`EXISTS (SELECT 1 FROM product_variants WHERE product_id = ${products.id} AND is_active = 1)`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .limit(pageSize)
    .offset(offset)
    .all();

  const total =
    db.select({ c: sql<number>`COUNT(*)` }).from(products).where(where).get()?.c ?? 0;

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Update a product. Price changes are logged to price history. */
export function updateProduct(id: string, input: UpdateProductInput, changedBy?: string) {
  const current = getProductById(id);

  const priceChanged =
    (input.costPrice !== undefined && input.costPrice !== current.costPrice) ||
    (input.sellingPrice !== undefined && input.sellingPrice !== current.sellingPrice);

  if (priceChanged) {
    // Log price history before updating
    db.insert(productPriceHistory)
      .values({
        id: newId(),
        productId: id,
        costPrice: input.costPrice ?? current.costPrice,
        sellingPrice: input.sellingPrice ?? current.sellingPrice,
        changedBy: changedBy ?? null,
      })
      .run();
  }

  db.update(products)
    .set({ ...input, updatedAt: now() })
    .where(eq(products.id, id))
    .run();

  return getProductById(id);
}

/** Soft-delete (deactivate) a product */
export function deactivateProduct(id: string) {
  getProductById(id);
  db.update(products).set({ isActive: false, updatedAt: now() }).where(eq(products.id, id)).run();
}

/** Hard-delete a product permanently.
 *  Refuses if the product has any sales history (audit trail must be preserved).
 *  Cleans up non-cascaded tables (stock, stockLedger, priceHistory) before deleting.
 *  variantAttributes / productVariants / etc. are cascade-deleted automatically. */
export function deleteProduct(id: string) {
  getProductById(id); // throws NotFoundError if missing

  const soldCount =
    db.select({ c: sql<number>`COUNT(*)` })
      .from(saleItems)
      .where(eq(saleItems.productId, id))
      .get()?.c ?? 0;

  if (soldCount > 0) {
    throw new ValidationError(
      "This product has sales history and cannot be permanently deleted. Use Deactivate instead to hide it from inventory."
    );
  }

  // Remove non-cascaded dependent rows first
  db.delete(stockLedger).where(eq(stockLedger.productId, id)).run();
  db.delete(stock).where(eq(stock.productId, id)).run();
  db.delete(productPriceHistory).where(eq(productPriceHistory.productId, id)).run();

  // Delete the product — CASCADE removes: variantAttributes → variantOptions →
  // productVariantOptions, productVariants → variantStock
  db.delete(products).where(eq(products.id, id)).run();
}

/** Reactivate a product */
export function activateProduct(id: string) {
  getProductById(id);
  db.update(products).set({ isActive: true, updatedAt: now() }).where(eq(products.id, id)).run();
}

/** Get product price history */
export function getProductPriceHistory(productId: string) {
  getProductById(productId);
  return db
    .select()
    .from(productPriceHistory)
    .where(eq(productPriceHistory.productId, productId))
    .orderBy(sql`${productPriceHistory.effectiveAt} DESC`)
    .all();
}
