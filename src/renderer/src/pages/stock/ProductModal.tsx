import React, { useState, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

const UNITS = ["pcs", "kg", "g", "liter", "ml", "box", "bag", "pair", "set", "meter", "cm"];

export type ProductForEdit = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  reorderPoint: number;
  reorderQty: number;
  isSerialized: boolean;
  imageUrl: string | null;
};

interface ProductModalProps {
  product?: ProductForEdit | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSuccess }) => {
  const t = useAppStore((s) => s.theme)
	const sym = useAppStore((s) => s.currency.symbol);
  const isEdit = !!product;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl]       = useState(product?.imageUrl ?? "");
  const [sku, setSku]                 = useState(product?.sku ?? "");
  const [name, setName]               = useState(product?.name ?? "");
  const [barcode, setBarcode]         = useState(product?.barcode ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId]   = useState(product?.categoryId ?? "");
  const [unitOfMeasure, setUnit]      = useState(product?.unitOfMeasure ?? "pcs");
  const [costPrice, setCostPrice]     = useState(String(product?.costPrice ?? ""));
  const [sellingPrice, setSelling]    = useState(String(product?.sellingPrice ?? ""));
  const [taxRate, setTaxRate]         = useState(String(product?.taxRate ? product.taxRate * 100 : 0));
  const [reorderPoint, setReorderPt]  = useState(String(product?.reorderPoint ?? 0));
  const [reorderQty, setReorderQty]   = useState(String(product?.reorderQty ?? 0));
  const [isSerialized, setSerialized] = useState(product?.isSerialized ?? false);
  const [confirmDelete, setConfirm]   = useState(false);

  const { data: categoriesData } = trpc.category.list.useQuery({});
  const categories = (categoriesData ?? []) as { id: string; name: string }[];

  const createMut     = trpc.product.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const updateMut     = trpc.product.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const deactivateMut = trpc.product.deactivate.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const isPending = createMut.isPending || updateMut.isPending;
  const errorMsg  = (createMut.error as any)?.message ?? (updateMut.error as any)?.message;
  const canSave   = !isPending && sku.trim() !== "" && name.trim() !== "" && sellingPrice !== "";

  // ── Image pick ───────────────────────────────────────────────
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = () => {
    const costNum = parseFloat(costPrice);
    const sellNum = parseFloat(sellingPrice);
    if (!sku.trim() || !name.trim() || isNaN(sellNum) || sellNum <= 0) return;

    const payload = {
      name:         name.trim(),
      barcode:      barcode.trim() || undefined,
      description:  description.trim() || undefined,
      categoryId:   categoryId || undefined,
      unitOfMeasure,
      costPrice:    isNaN(costNum) ? 0 : costNum,
      sellingPrice: sellNum,
      taxRate:      (parseFloat(taxRate) || 0) / 100,
      reorderPoint: parseFloat(reorderPoint) || 0,
      reorderQty:   parseFloat(reorderQty) || 0,
      isSerialized,
      imageUrl:     imageUrl || undefined,
    };

    if (isEdit) {
      updateMut.mutate({ id: product!.id, data: payload });
    } else {
      createMut.mutate({ ...payload, sku: sku.trim() });
    }
  };

  // ── Styles ───────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "10px",
    padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.5px", display: "block", marginBottom: "5px",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: "600px", margin: "0 16px",
          background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden",
          animation: "slideUp 0.22s ease", maxHeight: "90vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
            style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Image upload */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            {/* Thumbnail */}
            <div
              style={{ width: "88px", height: "88px", borderRadius: "12px", border: `2px dashed ${t.inputBorder}`, background: t.inputBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="product" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <Icon name="product" size={22} style={{ color: t.textFaint, display: "block", margin: "0 auto 4px" }} />
                  <span style={{ color: t.textFaint, fontSize: "9px" }}>Click to add</span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "7px 14px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                {imageUrl ? "Change Photo" : "Upload Photo"}
              </button>
              {imageUrl && (
                <button
                  onClick={handleRemoveImage}
                  style={{ padding: "7px 14px", borderRadius: "8px", border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Remove Photo
                </button>
              )}
              <p style={{ color: t.textFaint, fontSize: "10px" }}>Max 2 MB · JPG, PNG, WebP</p>
            </div>
          </div>

          {/* SKU + Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>SKU *</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. PROD-001"
                disabled={isEdit}
                autoFocus={!isEdit}
                style={{ ...inputStyle, opacity: isEdit ? 0.6 : 1 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
                autoFocus={isEdit}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Barcode + Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Barcode</label>
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
                <option value="">— No category —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Unit + Description */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Unit of Measure</label>
              <select value={unitOfMeasure} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" style={inputStyle} />
            </div>
          </div>

          {/* Prices */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Cost Price ({sym}) *</label>
              <input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Selling Price ({sym}) *</label>
              <input type="number" min="0.01" step="0.01" value={sellingPrice} onChange={(e) => setSelling(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          </div>

          {/* Reorder + Serialized */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Reorder Point</label>
              <input type="number" min="0" value={reorderPoint} onChange={(e) => setReorderPt(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Reorder Qty</label>
              <input type="number" min="0" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", paddingBottom: "10px" }}>
                <input
                  type="checkbox"
                  checked={isSerialized}
                  onChange={(e) => setSerialized(e.target.checked)}
                  style={{ width: "15px", height: "15px", accentColor: "#7c3aed" }}
                />
                <div>
                  <span style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700 }}>Serialized</span>
                  <p style={{ color: t.textFaint, fontSize: "10px" }}>Track serial #s</p>
                </div>
              </label>
            </div>
          </div>

          {/* Error */}
          {errorMsg && <p style={{ color: "#ef4444", fontSize: "12px" }}>{errorMsg}</p>}

          {/* Confirm deactivate */}
          {isEdit && confirmDelete && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "12px 14px" }}>
              <p style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>
                Deactivate this product? It will be hidden from inventory.
              </p>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setConfirm(false)}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deactivateMut.mutate({ id: product!.id })}
                  disabled={deactivateMut.isPending}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {deactivateMut.isPending ? "Deactivating..." : "Yes, Deactivate"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
          {isEdit && !confirmDelete && (
            <button
              onClick={() => setConfirm(true)}
              style={{ padding: "10px 14px", borderRadius: "11px", border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Deactivate
            </button>
          )}
          <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <button
              onClick={onClose}
              style={{ padding: "10px 18px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{ padding: "10px 22px", borderRadius: "11px", border: "none", background: canSave ? "#7c3aed" : t.inputBg, color: canSave ? "#fff" : t.textFaint, fontSize: "13px", fontWeight: 700, cursor: canSave ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
