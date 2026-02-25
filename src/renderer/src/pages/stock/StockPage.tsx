import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";
import { ProductModal, type ProductForEdit } from "./ProductModal";
import type { IconKey } from "../../constants/icons";

const PAGE_SIZE = 50;
const COLS = "40px 80px 1.5fr 55px 85px 90px 80px 80px";
const HEADERS: { label: string; icon?: IconKey }[] = [
  { label: "" },
  { label: "SKU" },
  { label: "Product" },
  { label: "Unit" },
  { label: "On Hand" },
  { label: "Available" },
  { label: "Reorder" },
  { label: "" },
];

// ── Set Qty Modal ─────────────────────────────────────────────

interface SetQtyModalProps {
  product: {
    productId: string;
    name: string;
    sku: string;
    costPrice: number;
    qtyOnHand: number;
    hasRecord: boolean;
  };
  locationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SetQtyModal: React.FC<SetQtyModalProps> = ({ product, locationId, onClose, onSuccess }) => {
  const t = useAppStore((s) => s.theme)
	const sym = useAppStore((s) => s.currency.symbol);
  const [qty, setQty]   = useState(String(product.qtyOnHand));
  const [cost, setCost] = useState(String(product.costPrice));

  const setQtyMutation = trpc.stock.setQty.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const handleSave = () => {
    const qtyNum  = Number(qty);
    const costNum = Number(cost);
    if (isNaN(qtyNum) || qtyNum < 0) return;
    if (isNaN(costNum) || costNum < 0) return;
    setQtyMutation.mutate({ productId: product.productId, locationId, qty: qtyNum, unitCost: costNum });
  };

  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "10px",
    padding: "9px 12px", color: t.text, fontSize: "14px", outline: "none",
    fontFamily: "inherit", width: "100%",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: "380px", margin: "0 16px", background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden", animation: "slideUp 0.22s ease" }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Set Stock Quantity</h2>
            <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>{product.name}</p>
            <p style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace" }}>{product.sku}</p>
          </div>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: t.textFaint, fontSize: "12px" }}>Current Quantity</span>
            <span style={{ color: product.hasRecord ? t.text : "#f59e0b", fontSize: "14px", fontWeight: 700 }}>
              {product.hasRecord ? product.qtyOnHand : "Not initialized"}
            </span>
          </div>

          <div>
            <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>New Quantity *</label>
            <input type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} autoFocus />
          </div>

          <div>
            <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Unit Cost ({sym})</label>
            <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} style={inputStyle} />
            <p style={{ color: t.textFaint, fontSize: "10px", marginTop: "4px" }}>Used for stock valuation and COGS</p>
          </div>

          {setQtyMutation.isError && (
            <p style={{ color: "#ef4444", fontSize: "12px" }}>
              {(setQtyMutation.error as any)?.message ?? "Failed to update stock."}
            </p>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={setQtyMutation.isPending || qty === ""}
              style={{ flex: 2, padding: "11px", borderRadius: "11px", border: "none", background: setQtyMutation.isPending || qty === "" ? t.inputBg : "#7c3aed", color: setQtyMutation.isPending || qty === "" ? t.textFaint : "#fff", fontSize: "13px", fontWeight: 700, cursor: setQtyMutation.isPending || qty === "" ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              {setQtyMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main StockPage ────────────────────────────────────────────

export const StockPage: React.FC = () => {
  const t                  = useAppStore((s) => s.theme);
  const tr                 = useAppStore((s) => s.tr);
  const sym                = useAppStore((s) => s.currency.symbol);
  const lowStockThreshold  = useAppStore((s) => s.lowStockThreshold);

  const [locationId, setLocationId] = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [editQty, setEditQty]       = useState<any | null>(null);
  const [productModal, setProductModal] = useState<null | "create" | ProductForEdit>(null);

  const { data: locationsData } = trpc.location.list.useQuery({ isActive: true, pageSize: 100 });
  const locations = locationsData?.data ?? [];

  useEffect(() => {
    if (!locationId && locations.length > 0) setLocationId(locations[0].id);
  }, [locations, locationId]);

  const { data: inventoryData, isLoading, refetch } = trpc.stock.allProducts.useQuery(
    { locationId, page, pageSize: PAGE_SIZE, search: search || undefined },
    { enabled: !!locationId }
  );
  const { data: valueData }    = trpc.stock.inventoryValue.useQuery({ locationId }, { enabled: !!locationId });
  const { data: lowStockList } = trpc.stock.lowStock.useQuery({ locationId }, { enabled: !!locationId });

  const inventory         = inventoryData?.data ?? [];
  const total             = inventoryData?.total ?? 0;
  const totalPages        = Math.max(inventoryData?.totalPages ?? 1, 1);
  const lowStockCount     = lowStockList?.length ?? 0;
  const uninitializedCount = inventory.filter((i: any) => !i.hasRecord).length;

  const pageButtons = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + i;
  }).filter((p) => p >= 1 && p <= totalPages);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };

  const summaryCards: { label: string; value: string; color: string; icon: IconKey }[] = [
    { label: "Total Value",      value: `${sym}${Number(valueData?.totalValue ?? 0).toLocaleString()}`, color: "#7c3aed", icon: "product" },
    { label: "Total SKUs",       value: String(valueData?.totalItems ?? 0),                         color: "#3b82f6", icon: "stock"   },
    { label: "Low Stock Alerts", value: String(lowStockCount),  color: lowStockCount > 0  ? "#ef4444" : "#10b981", icon: "bell"    },
    { label: "Not Initialized",  value: String(uninitializedCount), color: uninitializedCount > 0 ? "#f59e0b" : "#10b981", icon: "plus" },
  ];

  // Build a ProductForEdit object from a table row (all fields now come from the query)
  const rowToProduct = (item: any): ProductForEdit => ({
    id:            item.productId,
    sku:           item.sku,
    barcode:       item.barcode   ?? null,
    name:          item.name,
    description:   item.description ?? null,
    categoryId:    item.categoryId  ?? null,
    unitOfMeasure: item.unitOfMeasure,
    costPrice:     item.costPrice,
    sellingPrice:  item.sellingPrice,
    taxRate:       item.taxRate   ?? 0,
    reorderPoint:  item.reorderPoint,
    reorderQty:    item.reorderQty  ?? 0,
    isSerialized:  item.isSerialized ?? false,
    imageUrl:      item.imageUrl  ?? null,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: t.text, fontSize: "21px", fontWeight: 800, letterSpacing: "-0.5px" }}>{tr.stock}</h1>
          <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>
            Click a row to set quantity · Edit or deactivate with the action buttons
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setProductModal("create")}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <Icon name="plus" size={13} style={{ color: "#fff" }} />
            Add Product
          </button>
          {locations.length > 0 ? (
            <select
              value={locationId}
              onChange={(e) => { setLocationId(e.target.value); setPage(1); setSearch(""); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 14px", color: t.text, fontSize: "13px", outline: "none", fontFamily: "inherit", minWidth: "180px" }}
            >
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          ) : (
            <span style={{ color: t.textFaint, fontSize: "13px" }}>No locations configured</span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {locationId && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {summaryCards.map((card) => (
            <div key={card.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: `${card.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={card.icon} size={17} style={{ color: card.color }} />
              </div>
              <div>
                <p style={{ color: t.textFaint, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{card.label}</p>
                <p style={{ color: t.text, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", marginTop: "2px" }}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uninitialized warning */}
      {locationId && uninitializedCount > 0 && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Icon name="bell" size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <p style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600 }}>
            {uninitializedCount} product{uninitializedCount !== 1 ? "s" : ""} have no stock record at this location. Click them to set an opening quantity before selling.
          </p>
        </div>
      )}

      {/* Search */}
      {locationId && (
        <div style={{ position: "relative", maxWidth: "280px" }}>
          <div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}>
            <Icon name="search" size={13} />
          </div>
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search products..."
            style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px 9px 33px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
      )}

      {/* Table */}
      {!locationId ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "56px", textAlign: "center" }}>
          <Icon name="stock" size={32} style={{ color: t.textFaint, display: "block", margin: "0 auto 12px" }} />
          <p style={{ color: t.textFaint, fontSize: "13px" }}>Select a location to view inventory</p>
        </div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: "8px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
            {HEADERS.map((h, i) => (
              <span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h.label}</span>
            ))}
          </div>

          {isLoading ? (
            <div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
          ) : inventory.length === 0 ? (
            <div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>No products found</div>
          ) : (
            inventory.map((item: any) => {
              const uninitialized = !item.hasRecord;
              return (
                <div
                  key={item.productId}
                  onClick={() => setEditQty(item)}
                  style={{ display: "grid", gridTemplateColumns: COLS, gap: "8px", padding: "10px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Photo thumbnail */}
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", overflow: "hidden", background: t.inputBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Icon name="product" size={13} style={{ color: t.textFaint }} />
                    }
                  </div>

                  {/* SKU */}
                  <span style={{ color: t.textFaint, fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sku}</span>

                  {/* Name + badges */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                    <div style={{ display: "flex", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
                      {uninitialized && (
                        <span style={{ fontSize: "9px", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: "4px" }}>UNINITIALIZED</span>
                      )}
                      {!uninitialized && Number(item.qtyAvailable) <= lowStockThreshold && (
                        <span style={{ fontSize: "9px", fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: "4px" }}>LOW</span>
                      )}
                    </div>
                  </div>

                  {/* Unit */}
                  <span style={{ color: t.textMuted, fontSize: "12px" }}>{item.unitOfMeasure}</span>

                  {/* On Hand */}
                  <span style={{ color: uninitialized ? t.textFaint : t.text, fontSize: "13px", fontWeight: 500 }}>
                    {uninitialized ? "—" : Number(item.qtyOnHand).toLocaleString()}
                  </span>

                  {/* Available */}
                  <span style={{ color: uninitialized ? t.textFaint : Number(item.qtyAvailable) <= 0 ? "#ef4444" : t.text, fontSize: "13px", fontWeight: 600 }}>
                    {uninitialized ? "—" : Number(item.qtyAvailable).toLocaleString()}
                  </span>

                  {/* Reorder */}
                  <span style={{ color: t.textFaint, fontSize: "12px" }}>{Number(item.reorderPoint).toLocaleString()}</span>

                  {/* Actions */}
                  <div
                    style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      title="Edit product"
                      onClick={() => setProductModal(rowToProduct(item))}
                      style={{ width: "28px", height: "28px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = t.inputBg)}
                    >
                      <Icon name="edit" size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination */}
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: t.textFaint, fontSize: "12px" }}>{tr.showing} {inventory.length} {tr.of} {total}</span>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "3px" }}>
                {pageButtons.map((p) => (
                  <button key={p} onClick={(e) => { e.stopPropagation(); setPage(p); }} style={{ width: "27px", height: "27px", borderRadius: "7px", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", background: p === page ? "#7c3aed" : t.inputBg, color: p === page ? "#fff" : t.textMuted }}>{p}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Set Qty modal */}
      {editQty && (
        <SetQtyModal
          product={editQty}
          locationId={locationId}
          onClose={() => setEditQty(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Product create / edit modal */}
      {productModal !== null && (
        <ProductModal
          product={productModal === "create" ? undefined : productModal}
          onClose={() => setProductModal(null)}
          onSuccess={() => { refetch(); setProductModal(null); }}
        />
      )}
    </div>
  );
};
