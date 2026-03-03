import React, { useState, useRef } from "react";
import { AppSelect } from '../../components/ui/AppSelect';
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
  isSerialized: boolean;
  imageUrl: string | null;
};

interface ProductModalProps {
  product?: ProductForEdit | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Variants Tab ──────────────────────────────────────────────

const VariantsTab: React.FC<{ productId: string }> = ({ productId }) => {
  const t = useAppStore((s) => s.theme);
  const sym = useAppStore((s) => s.currency.symbol);

  const [newAttrName, setNewAttrName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState<Record<string, string>>({});
  const [editingVariant, setEditingVariant] = useState<Record<string, Partial<{ sku: string; costPrice: string; sellingPrice: string }>>>({});

  const { data: attrs, refetch: refetchAttrs } = trpc.variant.getAttributes.useQuery({ productId });
  const { data: variants, refetch: refetchVariants } = trpc.variant.listVariants.useQuery({ productId });

  const createAttr = trpc.variant.createAttribute.useMutation({
    onSuccess: () => { refetchAttrs(); setNewAttrName(""); },
  });
  const deleteAttr = trpc.variant.deleteAttribute.useMutation({
    onSuccess: () => { refetchAttrs(); refetchVariants(); },
  });
  const addOption = trpc.variant.addOption.useMutation({
    onSuccess: (_, vars) => {
      refetchAttrs();
      setNewOptionValues((prev) => ({ ...prev, [vars.attributeId]: "" }));
    },
  });
  const removeOption = trpc.variant.removeOption.useMutation({
    onSuccess: () => { refetchAttrs(); refetchVariants(); },
  });
  const generateVariants = trpc.variant.generateVariants.useMutation({
    onSuccess: () => refetchVariants(),
  });
  const updateVariant = trpc.variant.updateVariant.useMutation({
    onSuccess: () => refetchVariants(),
  });

  const attributes = attrs ?? [];
  const variantList = variants ?? [];
  const hasOptions = attributes.some((a: any) => a.options.length > 0);

  const inputStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "8px",
    padding: "6px 10px", color: t.text, fontSize: "12px", outline: "none",
    fontFamily: "inherit",
  };

  const saveVariantField = (id: string, field: string, value: string) => {
    const numVal = parseFloat(value);
    const data: any = {};
    if (field === "sku") data.sku = value;
    else if (field === "costPrice" && !isNaN(numVal)) data.costPrice = numVal;
    else if (field === "sellingPrice" && !isNaN(numVal) && numVal > 0) data.sellingPrice = numVal;
    if (Object.keys(data).length > 0) updateVariant.mutate({ id, data });
    setEditingVariant((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id][field as keyof typeof next[string]];
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Attributes Section */}
      <div>
        <p style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
          Attributes
        </p>

        {attributes.map((attr: any) => (
          <div key={attr.id} style={{ marginBottom: "12px", padding: "10px 12px", background: t.inputBg, borderRadius: "10px", border: `1px solid ${t.inputBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: t.text, fontSize: "12px", fontWeight: 700 }}>{attr.name}</span>
              <button
                onClick={() => deleteAttr.mutate({ id: attr.id })}
                style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Remove
              </button>
            </div>

            {/* Options chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
              {attr.options.map((opt: any) => (
                <span key={opt.id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "var(--primary-12)", border: "1px solid var(--primary-22)", borderRadius: "6px", fontSize: "11px", color: t.text }}>
                  {opt.value}
                  <button
                    onClick={() => removeOption.mutate({ id: opt.id })}
                    style={{ background: "none", border: "none", color: t.textFaint, cursor: "pointer", fontSize: "13px", lineHeight: 1, padding: 0 }}
                  >×</button>
                </span>
              ))}
            </div>

            {/* Add option */}
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={newOptionValues[attr.id] ?? ""}
                onChange={(e) => setNewOptionValues((p) => ({ ...p, [attr.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (newOptionValues[attr.id] ?? "").trim()) {
                    addOption.mutate({ attributeId: attr.id, value: newOptionValues[attr.id].trim() });
                  }
                }}
                placeholder="Add option (Enter)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  const val = (newOptionValues[attr.id] ?? "").trim();
                  if (val) addOption.mutate({ attributeId: attr.id, value: val });
                }}
                style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Add
              </button>
            </div>
          </div>
        ))}

        {/* Add attribute */}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newAttrName.trim()) {
                createAttr.mutate({ productId, name: newAttrName.trim() });
              }
            }}
            placeholder="New attribute name (e.g. Color, Size)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => { if (newAttrName.trim()) createAttr.mutate({ productId, name: newAttrName.trim() }); }}
            disabled={createAttr.isPending || !newAttrName.trim()}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            + Attribute
          </button>
        </div>
      </div>

      {/* Generate button */}
      {hasOptions && (
        <button
          onClick={() => generateVariants.mutate({ productId })}
          disabled={generateVariants.isPending}
          style={{ padding: "9px 16px", borderRadius: "10px", border: "none", background: "#10b981", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          {generateVariants.isPending ? "Generating..." : "⚡ Generate Variants"}
        </button>
      )}

      {/* Variants Table */}
      {variantList.length > 0 && (
        <div>
          <p style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Variants ({variantList.length})
          </p>
          <div style={{ border: `1px solid ${t.inputBorder}`, borderRadius: "10px", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px 90px 60px", gap: "0", background: t.inputBg, padding: "7px 10px", borderBottom: `1px solid ${t.inputBorder}` }}>
              {["Combination", "SKU", `Cost (${sym})`, `Price (${sym})`, "Active"].map((h) => (
                <span key={h} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {variantList.map((v: any, i: number) => {
              const editing = editingVariant[v.id] ?? {};
              return (
                <div
                  key={v.id}
                  style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px 90px 60px", gap: "0", padding: "7px 10px", borderBottom: i < variantList.length - 1 ? `1px solid ${t.borderMid}` : "none", alignItems: "center" }}
                >
                  <span style={{ color: t.text, fontSize: "12px", fontWeight: 600 }}>{v.optionLabel || "—"}</span>

                  {/* SKU */}
                  <input
                    value={editing.sku ?? v.sku}
                    onChange={(e) => setEditingVariant((p) => ({ ...p, [v.id]: { ...p[v.id], sku: e.target.value } }))}
                    onBlur={(e) => saveVariantField(v.id, "sku", e.target.value)}
                    style={{ ...inputStyle, fontSize: "11px", padding: "4px 7px" }}
                  />

                  {/* Cost */}
                  <input
                    type="number" min="0" step="0.01"
                    value={editing.costPrice ?? String(v.costPrice)}
                    onChange={(e) => setEditingVariant((p) => ({ ...p, [v.id]: { ...p[v.id], costPrice: e.target.value } }))}
                    onBlur={(e) => saveVariantField(v.id, "costPrice", e.target.value)}
                    style={{ ...inputStyle, fontSize: "11px", padding: "4px 7px" }}
                  />

                  {/* Selling Price */}
                  <input
                    type="number" min="0.01" step="0.01"
                    value={editing.sellingPrice ?? String(v.sellingPrice)}
                    onChange={(e) => setEditingVariant((p) => ({ ...p, [v.id]: { ...p[v.id], sellingPrice: e.target.value } }))}
                    onBlur={(e) => saveVariantField(v.id, "sellingPrice", e.target.value)}
                    style={{ ...inputStyle, fontSize: "11px", padding: "4px 7px" }}
                  />

                  {/* Active toggle */}
                  <input
                    type="checkbox"
                    checked={v.isActive}
                    onChange={(e) => updateVariant.mutate({ id: v.id, data: { isActive: e.target.checked } })}
                    style={{ width: "15px", height: "15px", accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {variantList.length === 0 && attributes.length === 0 && (
        <p style={{ color: t.textFaint, fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
          Add attributes (e.g. Color, Size) then generate variants.
        </p>
      )}
    </div>
  );
};

// ── Main Modal ────────────────────────────────────────────────

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSuccess }) => {
  const t = useAppStore((s) => s.theme);
  const sym = useAppStore((s) => s.currency.symbol);
  const isEdit = !!product;

  const [activeTab, setActiveTab] = useState<"details" | "variants">("details");
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
  const [isSerialized, setSerialized] = useState(product?.isSerialized ?? false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete]         = useState(false);

  const { data: categoriesData } = trpc.category.list.useQuery({});
  const categories = (categoriesData ?? []) as { id: string; name: string; skuPrefix?: string | null }[];

  // Auto-generate SKU when a category with a skuPrefix is selected (new products only)
  const { data: nextSkuData } = trpc.category.nextSku.useQuery(
    { categoryId: categoryId },
    { enabled: !isEdit && !!categoryId && !!categories.find((c) => c.id === categoryId)?.skuPrefix }
  );
  React.useEffect(() => {
    if (!isEdit && nextSkuData?.sku) setSku(nextSkuData.sku);
  }, [nextSkuData?.sku, isEdit]);

  const createMut     = trpc.product.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const updateMut     = trpc.product.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const deactivateMut = trpc.product.deactivate.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const deleteMut     = trpc.product.delete.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

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

  const maxWidth = isEdit && activeTab === "variants" ? "780px" : "600px";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth, margin: "0 16px",
          background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden",
          animation: "slideUp 0.22s ease", maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          transition: "max-width 0.2s ease",
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px 0", borderBottom: `1px solid ${t.borderMid}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
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

          {/* Tab switcher — only in edit mode */}
          {isEdit && (
            <div style={{ display: "flex", gap: "2px", marginBottom: "-1px" }}>
              {(["details", "variants"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "7px 14px", border: "none", background: "none", cursor: "pointer",
                    fontSize: "12px", fontWeight: 700, fontFamily: "inherit",
                    color: activeTab === tab ? "var(--primary)" : t.textMuted,
                    borderBottom: activeTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Details Tab */}
          {activeTab === "details" && (
            <>
              {/* Image upload */}
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: "7px 14px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
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
                    style={{ ...inputStyle, opacity: isEdit ? 0.6 : 1, fontFamily: "monospace" }}
                  />
                  {!isEdit && nextSkuData?.sku && sku === nextSkuData.sku && (
                    <p style={{ color: "var(--primary)", fontSize: "10px", marginTop: "3px" }}>Auto-generated from category prefix</p>
                  )}
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
                 <AppSelect
                  value={categoryId}
                  onChange={(v) => {
                    setCategoryId(v);
                    // Clear SKU if switching to a category without prefix (only on new products)
                    if (!isEdit) {
                      const cat = categories.find((c) => c.id === v);
                      if (!cat?.skuPrefix) setSku("");
                    }
                  }}
                  options={[{ value: '', label: '— No category —' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                />
                </div>
              </div>

              {/* Unit + Description */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Unit of Measure</label>
                 <AppSelect
                  value={unitOfMeasure}
                  onChange={setUnit}
                  options={UNITS.map((u) => ({ value: u, label: u }))}
                  isSearchable={false}
                />
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

              {/* Serialized */}
              <div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", paddingBottom: "10px" }}>
                    <input
                      type="checkbox"
                      checked={isSerialized}
                      onChange={(e) => setSerialized(e.target.checked)}
                      style={{ width: "15px", height: "15px", accentColor: "var(--primary)" }}
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
              {isEdit && confirmDeactivate && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "12px 14px" }}>
                  <p style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Deactivate this product?</p>
                  <p style={{ color: t.textFaint, fontSize: "11px", marginBottom: "10px" }}>It will be hidden from inventory but history is kept.</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => setConfirmDeactivate(false)}
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

              {/* Confirm permanent delete */}
              {isEdit && confirmDelete && (
                <div style={{ background: "rgba(127,29,29,0.1)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: "10px", padding: "12px 14px" }}>
                  <p style={{ color: "#dc2626", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Permanently delete this product?</p>
                  <p style={{ color: t.textFaint, fontSize: "11px", marginBottom: "4px" }}>This cannot be undone. All stock records, variants, and price history will be removed.</p>
                  <p style={{ color: "#f59e0b", fontSize: "10px", fontWeight: 600, marginBottom: "10px" }}>Products that have been sold cannot be deleted.</p>
                  {deleteMut.isError && (
                    <p style={{ color: "#ef4444", fontSize: "11px", marginBottom: "8px" }}>
                      {(deleteMut.error as any)?.message ?? "Delete failed."}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => { setConfirmDelete(false); deleteMut.reset(); }}
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteMut.mutate({ id: product!.id })}
                      disabled={deleteMut.isPending}
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      {deleteMut.isPending ? "Deleting..." : "Delete Permanently"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Variants Tab */}
          {activeTab === "variants" && isEdit && product && (
            <VariantsTab productId={product.id} />
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        {activeTab === "details" && (
          <div style={{ padding: "14px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
            {isEdit && !confirmDeactivate && !confirmDelete && (
              <>
                <button
                  onClick={() => setConfirmDeactivate(true)}
                  style={{ padding: "10px 12px", borderRadius: "11px", border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Deactivate
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ padding: "10px 12px", borderRadius: "11px", border: "1px solid rgba(239,68,68,0.35)", background: "transparent", color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Delete
                </button>
              </>
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
                style={{ padding: "10px 22px", borderRadius: "11px", border: "none", background: canSave ? "var(--primary)" : t.inputBg, color: canSave ? "#fff" : t.textFaint, fontSize: "13px", fontWeight: 700, cursor: canSave ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}
              >
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "variants" && (
          <div style={{ padding: "14px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ padding: "10px 18px", borderRadius: "11px", border: "none", background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
