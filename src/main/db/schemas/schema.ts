import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const journal_table = sqliteTable('journal', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull()
})

// ============================================================
// HELPERS
// ============================================================
const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

// ============================================================
// USERS & AUTH
// ============================================================
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "manager", "cashier"] })
    .notNull()
    .default("cashier"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

// ============================================================
// LOCATIONS / BRANCHES
// ============================================================
export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

// ============================================================
// SUPPLIERS
// ============================================================
export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

// ============================================================
// CATEGORIES
// ============================================================
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id"), // Self-referencing for nested categories
  description: text("description"),
  ...timestamps,
});

// ============================================================
// PRODUCTS
// ============================================================
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => categories.id),
  unitOfMeasure: text("unit_of_measure").notNull().default("pcs"), // pcs, kg, liter, box
  costPrice: real("cost_price").notNull().default(0),       // Latest purchase cost
  sellingPrice: real("selling_price").notNull(),
  taxRate: real("tax_rate").notNull().default(0),           // e.g. 0.07 for 7%
  reorderPoint: real("reorder_point").notNull().default(0), // Alert threshold
  reorderQty: real("reorder_qty").notNull().default(0),     // Suggested reorder qty
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isSerialized: integer("is_serialized", { mode: "boolean" }).notNull().default(false),
  imageUrl: text("image_url"),
  ...timestamps,
});

// ============================================================
// PRODUCT PRICE HISTORY
// Tracks price changes over time for reporting accuracy
// ============================================================
export const productPriceHistory = sqliteTable("product_price_history", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  costPrice: real("cost_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  changedBy: text("changed_by").references(() => users.id),
  effectiveAt: text("effective_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// STOCK (Inventory per location)
// ============================================================
export const stock = sqliteTable(
  "stock",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    qtyOnHand: real("qty_on_hand").notNull().default(0),
    qtyReserved: real("qty_reserved").notNull().default(0), // Reserved for pending orders
    qtyAvailable: real("qty_available") // Computed: qtyOnHand - qtyReserved
      .generatedAlwaysAs(sql`qty_on_hand - qty_reserved`),
    ...timestamps,
  },
  (t) => ({
    uniqProductLocation: index("uniq_product_location").on(t.productId, t.locationId),
  })
);

// ============================================================
// STOCK LEDGER
// The heart of stock control. Every stock movement is recorded here.
// Never update or delete — append only.
// ============================================================
export const stockLedger = sqliteTable(
  "stock_ledger",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),

    // Movement type
    movementType: text("movement_type", {
      enum: [
        "purchase_in",       // Stock received from supplier
        "sale_out",          // Stock sold to customer
        "return_in",         // Customer return (stock back in)
        "return_out",        // Return to supplier (stock out)
        "adjustment_in",     // Manual positive adjustment
        "adjustment_out",    // Manual negative adjustment
        "transfer_in",       // Received from another location
        "transfer_out",      // Sent to another location
        "opening_balance",   // Initial stock setup
        "damage_out",        // Damaged/written-off stock
        "production_in",     // Finished goods from production
        "production_out",    // Raw materials used in production
      ],
    }).notNull(),

    qty: real("qty").notNull(),             // Always positive; direction is from movementType
    qtyBefore: real("qty_before").notNull(),
    qtyAfter: real("qty_after").notNull(),

    unitCost: real("unit_cost"),            // Cost at time of movement (for COGS)
    totalCost: real("total_cost"),          // qty * unitCost

    // References to source documents
    referenceType: text("reference_type", {
      enum: ["sale", "purchase_order", "stock_adjustment", "transfer", "production"],
    }),
    referenceId: text("reference_id"),      // FK to source document (sale, PO, etc.)

    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    idxProduct: index("idx_ledger_product").on(t.productId),
    idxLocation: index("idx_ledger_location").on(t.locationId),
    idxReference: index("idx_ledger_reference").on(t.referenceType, t.referenceId),
    idxCreatedAt: index("idx_ledger_created_at").on(t.createdAt),
  })
);

// ============================================================
// CUSTOMERS
// ============================================================
export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  creditLimit: real("credit_limit").notNull().default(0),
  outstandingBalance: real("outstanding_balance").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

// ============================================================
// SALES (POS Transactions)
// ============================================================
export const sales = sqliteTable(
  "sales",
  {
    id: text("id").primaryKey(),
    receiptNo: text("receipt_no").notNull().unique(), // Human-readable receipt #
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    customerId: text("customer_id").references(() => customers.id),
    cashierId: text("cashier_id")
      .notNull()
      .references(() => users.id),

    status: text("status", {
      enum: ["draft", "completed", "voided", "refunded", "partially_refunded"],
    })
      .notNull()
      .default("draft"),

    // Amounts
    subtotal: real("subtotal").notNull().default(0),
    discountAmount: real("discount_amount").notNull().default(0),
    taxAmount: real("tax_amount").notNull().default(0),
    roundingAmount: real("rounding_amount").notNull().default(0),
    totalAmount: real("total_amount").notNull().default(0),
    paidAmount: real("paid_amount").notNull().default(0),
    changeAmount: real("change_amount").notNull().default(0),

    notes: text("notes"),
    voidedBy: text("voided_by").references(() => users.id),
    voidedAt: text("voided_at"),
    voidReason: text("void_reason"),

    ...timestamps,
  },
  (t) => ({
    idxLocation: index("idx_sales_location").on(t.locationId),
    idxCustomer: index("idx_sales_customer").on(t.customerId),
    idxCashier: index("idx_sales_cashier").on(t.cashierId),
    idxCreatedAt: index("idx_sales_created_at").on(t.createdAt),
  })
);

// ============================================================
// SALE ITEMS
// ============================================================
export const saleItems = sqliteTable("sale_items", {
  id: text("id").primaryKey(),
  saleId: text("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  qty: real("qty").notNull(),
  unitPrice: real("unit_price").notNull(),       // Price at time of sale
  unitCost: real("unit_cost").notNull(),         // Cost at time of sale (for COGS)
  discountAmount: real("discount_amount").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  totalAmount: real("total_amount").notNull(),
  notes: text("notes"),
});

// ============================================================
// PAYMENTS
// Supports split payments (cash + card + etc)
// ============================================================
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  saleId: text("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  method: text("method", {
    enum: ["cash", "credit_card", "debit_card", "qr_code", "store_credit", "loyalty_points"],
  }).notNull(),
  amount: real("amount").notNull(),
  reference: text("reference"), // Card approval code, QR transaction ID, etc.
  ...timestamps,
});

// ============================================================
// PURCHASE ORDERS
// ============================================================
export const purchaseOrders = sqliteTable("purchase_orders", {
  id: text("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id),
  status: text("status", {
    enum: ["draft", "sent", "partial", "received", "cancelled"],
  })
    .notNull()
    .default("draft"),
  expectedAt: text("expected_at"),
  subtotal: real("subtotal").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  totalAmount: real("total_amount").notNull().default(0),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  ...timestamps,
});

export const purchaseOrderItems = sqliteTable("purchase_order_items", {
  id: text("id").primaryKey(),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  qtyOrdered: real("qty_ordered").notNull(),
  qtyReceived: real("qty_received").notNull().default(0),
  unitCost: real("unit_cost").notNull(),
  totalCost: real("total_cost").notNull(),
});

// ============================================================
// STOCK ADJUSTMENTS
// Manual inventory adjustments (cycle count, damage, etc.)
// ============================================================
export const stockAdjustments = sqliteTable("stock_adjustments", {
  id: text("id").primaryKey(),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id),
  adjustmentType: text("adjustment_type", {
    enum: ["cycle_count", "damage", "expiry", "found", "other"],
  }).notNull(),
  status: text("status", {
    enum: ["draft", "approved", "rejected"],
  })
    .notNull()
    .default("draft"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  ...timestamps,
});

export const stockAdjustmentItems = sqliteTable("stock_adjustment_items", {
  id: text("id").primaryKey(),
  adjustmentId: text("adjustment_id")
    .notNull()
    .references(() => stockAdjustments.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  qtySystem: real("qty_system").notNull(),   // What system says
  qtyActual: real("qty_actual").notNull(),   // What was physically counted
  qtyDiff: real("qty_diff")                  // qtyActual - qtySystem
    .generatedAlwaysAs(sql`qty_actual - qty_system`),
  unitCost: real("unit_cost").notNull(),
  reason: text("reason"),
});

// ============================================================
// STOCK TRANSFERS (between locations)
// ============================================================
export const stockTransfers = sqliteTable("stock_transfers", {
  id: text("id").primaryKey(),
  transferNo: text("transfer_no").notNull().unique(),
  fromLocationId: text("from_location_id")
    .notNull()
    .references(() => locations.id),
  toLocationId: text("to_location_id")
    .notNull()
    .references(() => locations.id),
  status: text("status", {
    enum: ["draft", "in_transit", "partial", "received", "cancelled"],
  })
    .notNull()
    .default("draft"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  receivedBy: text("received_by").references(() => users.id),
  receivedAt: text("received_at"),
  ...timestamps,
});

export const stockTransferItems = sqliteTable("stock_transfer_items", {
  id: text("id").primaryKey(),
  transferId: text("transfer_id")
    .notNull()
    .references(() => stockTransfers.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  qtySent: real("qty_sent").notNull(),
  qtyReceived: real("qty_received").notNull().default(0),
  unitCost: real("unit_cost").notNull(),
  notes: text("notes"),
});

// ============================================================
// EXPENSE CATEGORIES & EXPENSES
// ============================================================

export const expenseCategories = sqliteTable("expense_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#8b5cf6"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    expenseNo: text("expense_no").notNull().unique(),
    categoryId: text("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    locationId: text("location_id").references(() => locations.id),
    amount: real("amount").notNull(),
    description: text("description").notNull(),
    paymentMethod: text("payment_method", {
      enum: ["cash", "card", "bank_transfer", "other"],
    })
      .notNull()
      .default("cash"),
    expenseDate: text("expense_date").notNull(),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("idx_expenses_category").on(t.categoryId),
    index("idx_expenses_date").on(t.expenseDate),
  ],
);

// ============================================================
// RELATIONS
// ============================================================
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  stock: many(stock),
  stockLedger: many(stockLedger),
  priceHistory: many(productPriceHistory),
  saleItems: many(saleItems),
}));

export const stockRelations = relations(stock, ({ one }) => ({
  product: one(products, { fields: [stock.productId], references: [products.id] }),
  location: one(locations, { fields: [stock.locationId], references: [locations.id] }),
}));

export const stockLedgerRelations = relations(stockLedger, ({ one }) => ({
  product: one(products, { fields: [stockLedger.productId], references: [products.id] }),
  location: one(locations, { fields: [stockLedger.locationId], references: [locations.id] }),
  createdByUser: one(users, { fields: [stockLedger.createdBy], references: [users.id] }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  location: one(locations, { fields: [sales.locationId], references: [locations.id] }),
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  cashier: one(users, { fields: [sales.cashierId], references: [users.id] }),
  items: many(saleItems),
  payments: many(payments),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  location: one(locations, { fields: [purchaseOrders.locationId], references: [locations.id] }),
  items: many(purchaseOrderItems),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
  location: one(locations, { fields: [expenses.locationId], references: [locations.id] }),
  createdByUser: one(users, { fields: [expenses.createdBy], references: [users.id] }),
}));
