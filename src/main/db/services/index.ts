// ============================================================
// POS + Stock Control — Service Barrel
// ============================================================

export * as UserService from "./user.service";
export * as MasterService from "./master.service";    // Locations, Suppliers, Categories
export * as ProductService from "./product.service";
export * as CustomerService from "./customer.service";
export * as StockService from "./stock.service";
export * as SaleService from "./sale.service";
export * as PurchaseOrderService from "./purchase-order.service";
export * as StockAdjustmentService from "./stock-adjustment.service";
export * as StockTransferService from "./stock-transfer.service";
export * as ExpenseService       from "./expense.service";
export * as VariantService       from "./variant.service";

// ============================================================
// QUICK REFERENCE — Function Index
// ============================================================
//
// USER SERVICE
//   createUser(input)
//   getUserById(id)
//   getUserByEmail(email)
//   verifyPassword(email, password)           ← For login
//   listUsers(params?)
//   updateUser(id, input)
//   changePassword(id, newPassword)
//   deactivateUser(id)
//   activateUser(id)
//
// MASTER SERVICE (Locations / Suppliers / Categories)
//   createLocation(input)     getLocationById(id)     listLocations(params?)    updateLocation(id, input)    deactivateLocation(id)
//   createSupplier(input)     getSupplierById(id)     listSuppliers(params?)    updateSupplier(id, input)    deactivateSupplier(id)
//   createCategory(input)     getCategoryById(id)     listCategories(params?)   updateCategory(id, input)    deleteCategory(id)
//   getCategoryTree()                                 ← Full nested tree
//
// PRODUCT SERVICE
//   createProduct(input)
//   getProductById(id)
//   getProductBySku(sku)
//   getProductByBarcode(barcode)              ← For POS barcode scanner
//   listProducts(params?)                     ← Supports search, category, lowStock filters
//   updateProduct(id, input, changedBy?)      ← Auto-logs price history if price changed
//   deactivateProduct(id)
//   activateProduct(id)
//   getProductPriceHistory(productId)
//
// CUSTOMER SERVICE
//   createCustomer(input)
//   getCustomerById(id)
//   getCustomerByEmail(email)
//   getCustomerByPhone(phone)
//   listCustomers(params?)
//   updateCustomer(id, input)
//   deactivateCustomer(id)
//   addLoyaltyPoints(customerId, points)
//   redeemLoyaltyPoints(customerId, points)
//   updateOutstandingBalance(customerId, delta)
//
// STOCK SERVICE (read + internal write helpers)
//   getStock(productId, locationId)           ← Single product at one location
//   getStockAllLocations(productId)           ← Product across all branches
//   getLocationInventory(locationId, params?) ← Full snapshot of a location
//   getLowStockProducts(locationId)           ← Products below reorder point
//   getInventoryValue(locationId)             ← Total stock value
//   queryStockLedger(params)                  ← Full audit trail with filters
//   reconstructStockFromLedger(productId, locationId) ← Reconciliation
//   setOpeningBalance(productId, locationId, qty, unitCost, createdBy)
//   updateReservedQty(productId, locationId, delta)
//   upsertStock(productId, locationId, delta) ← Internal: called by sale/PO/etc.
//   appendLedger(entry)                       ← Internal: append-only ledger write
//
// SALE SERVICE
//   createSale(input)                         ← Full POS checkout (atomic)
//   getSaleById(id)                           ← With items & payments
//   listSales(params?)
//   calculateSaleTotals(items)                ← Preview totals before saving
//   voidSale(saleId, voidedBy, reason)        ← Reverses stock movements
//   processSaleReturn(saleId, returnItems, processedBy, reason?)
//   getDailySummary(locationId, date)
//   getSalesByPaymentMethod(locationId, fromDate, toDate)
//   getTopSellingProducts(locationId, fromDate, toDate, limit?)
//
// PURCHASE ORDER SERVICE
//   createPurchaseOrder(input)                ← Creates draft PO
//   getPurchaseOrderById(id)
//   listPurchaseOrders(params?)
//   updatePurchaseOrder(id, input)
//   addPOItem(poId, item)
//   removePOItem(poId, poItemId)
//   updatePOItem(poId, poItemId, input)
//   sendPurchaseOrder(id)                     ← Draft → Sent
//   receivePurchaseOrder(poId, receivedItems, receivedBy) ← Updates stock + ledger
//   cancelPurchaseOrder(id)
//
// STOCK ADJUSTMENT SERVICE
//   createStockAdjustment(input)              ← Creates draft (no stock change yet)
//   getStockAdjustmentById(id)
//   listStockAdjustments(params?)
//   updateAdjustmentNotes(id, notes)
//   addAdjustmentItem(adjustmentId, item)
//   removeAdjustmentItem(adjustmentId, itemId)
//   approveStockAdjustment(id, approvedBy)    ← Applies changes to stock + ledger
//   rejectStockAdjustment(id, rejectedBy)
//
// STOCK TRANSFER SERVICE
//   createStockTransfer(input)                ← Creates & dispatches (deducts source immediately)
//   getStockTransferById(id)
//   listStockTransfers(params?)
//   receiveStockTransfer(transferId, receivedItems, receivedBy) ← Adds to destination
//   cancelStockTransfer(transferId, cancelledBy) ← Returns stock to source
