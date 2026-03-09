import React, { useState, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "../../components/ui/Icon";
import { trpc } from "../../trpc-client/trpc";

type Brand = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

// ── Brand Modal ────────────────────────────────────────────────

interface BrandModalProps {
  brand: Brand | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BrandModal: React.FC<BrandModalProps> = ({ brand, onClose, onSuccess }) => {
  const t = useAppStore((s) => s.theme);
  const tr = useAppStore((s) => s.tr);
  const isNew = !brand;

  const [name, setName] = useState(brand?.name ?? "");
  const [description, setDescription] = useState(brand?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? "");
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const create = trpc.brand.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const update = trpc.brand.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const isPending = create.isPending || update.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (isNew) {
      create.mutate({ name: name.trim(), description: description.trim() || null, logoUrl: logoUrl || null });
    } else {
      update.mutate({ id: brand!.id, data: { name: name.trim(), description: description.trim() || null, logoUrl: logoUrl || null, isActive } });
    }
  };

  const labelStyle: React.CSSProperties = {
    color: t.textMuted, fontSize: "10.5px", fontWeight: 700, display: "block",
    marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: "11px", padding: "9px 12px", color: t.text, fontSize: "13px",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
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
          position: "relative", width: "100%", maxWidth: "440px", margin: "0 16px",
          background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.22s ease",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>
              {isNew ? "New Brand" : "Edit Brand"}
            </h2>
            <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "3px" }}>
              {isNew ? "Add a new product brand" : brand?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Logo upload */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ width: "72px", height: "72px", borderRadius: "14px", border: `2px dashed ${t.inputBorder}`, background: t.inputBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <Icon name="brand" size={22} style={{ color: t.textFaint, display: "block", margin: "0 auto 4px" }} />
                  <span style={{ color: t.textFaint, fontSize: "9px" }}>Logo</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: t.textMuted, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Brand Logo</p>
              <p style={{ color: t.textFaint, fontSize: "11px", lineHeight: 1.5 }}>Click the box to upload. PNG, JPG under 2 MB.</p>
              {logoUrl && (
                <button onClick={() => setLogoUrl("")} style={{ marginTop: "6px", background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Remove logo</button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
          </div>
          <div>
            <label style={labelStyle}>Brand Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nike, Samsung, Unilever"
              autoFocus
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              style={inputStyle}
            />
          </div>
          {!isNew && (
            <label style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: "15px", height: "15px", accentColor: "var(--primary)" }}
              />
              <div>
                <span style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>Active</span>
                <p style={{ color: t.textFaint, fontSize: "11px" }}>Inactive brands are hidden from product form</p>
              </div>
            </label>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 22px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            disabled={isPending}
            style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {tr.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isPending || !name.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px var(--primary-35)", opacity: isPending || !name.trim() ? 0.7 : 1 }}
          >
            {isPending ? "..." : isNew ? "Create Brand" : tr.save_changes}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Brand Detail Drawer ────────────────────────────────────────

interface BrandDrawerProps {
  brandId: string;
  onClose: () => void;
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

const BrandDrawer: React.FC<BrandDrawerProps> = ({ brandId, onClose, onEdit, onDelete }) => {
  const t = useAppStore((s) => s.theme);
  const { data: brand, isLoading } = trpc.brand.getById.useQuery({ id: brandId });
  const b = brand as Brand | undefined;

  const fl: React.CSSProperties = { color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" };
  const fv: React.CSSProperties = { color: t.text, fontSize: "13px", fontWeight: 500 };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 56,
        width: "420px", maxWidth: "100vw",
        background: t.surface, borderLeft: `1px solid ${t.borderStrong}`,
        boxShadow: "-16px 0 48px rgba(0,0,0,0.25)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.borderMid}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Brand Detail</h2>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "9px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {isLoading ? (
            <p style={{ color: t.textFaint, fontSize: "13px", textAlign: "center", paddingTop: "40px" }}>Loading…</p>
          ) : !b ? null : (
            <>
              {/* Identity */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "96px", height: "96px", borderRadius: "20px", flexShrink: 0, overflow: "hidden",
                  background: b.logoUrl ? "#fff" : "var(--primary-15)",
                  border: b.logoUrl ? `1px solid ${t.border}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {b.logoUrl
                    ? <img src={b.logoUrl} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} />
                    : <Icon name="brand" size={38} style={{ color: "var(--primary)" }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h3 style={{ color: t.text, fontSize: "17px", fontWeight: 800, letterSpacing: "-0.3px" }}>{b.name}</h3>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
                      background: b.isActive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                      color: b.isActive ? "#10b981" : "#ef4444",
                    }}>
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {b.description && <p style={{ color: t.textMuted, fontSize: "12px", marginTop: "5px", lineHeight: 1.5 }}>{b.description}</p>}
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 12px" }}>
                  <p style={fl}>Created</p>
                  <p style={{ ...fv, fontSize: "12px" }}>{new Date(b.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ background: t.inputBg, borderRadius: "10px", padding: "10px 12px" }}>
                  <p style={fl}>Status</p>
                  <p style={{ ...fv, fontSize: "12px", color: b.isActive ? "#10b981" : "#ef4444" }}>{b.isActive ? "Active" : "Inactive"}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && b && (
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.borderMid}`, display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={() => onDelete(b)}
              style={{ padding: "9px 16px", borderRadius: "10px", border: `1px solid rgba(239,68,68,0.3)`, background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Delete
            </button>
            <button
              onClick={() => onEdit(b)}
              style={{ flex: 1, padding: "9px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Edit Brand
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Delete Confirm Modal ───────────────────────────────────────

interface DeleteModalProps {
  brand: Brand;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ brand, onClose, onSuccess }) => {
  const t = useAppStore((s) => s.theme);
  const tr = useAppStore((s) => s.tr);
  const deleteMut = trpc.brand.delete.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: t.surface, border: `1px solid ${t.borderStrong}`,
          borderRadius: "18px", padding: "22px", maxWidth: "340px", width: "calc(100% - 32px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)", animation: "slideUp 0.2s ease",
        }}
      >
        <h3 style={{ color: t.text, fontWeight: 700, fontSize: "15px" }}>Delete Brand?</h3>
        <p style={{ color: t.textMuted, fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>
          Delete <strong style={{ color: t.text }}>{brand.name}</strong>? Products using this brand will have it removed.
        </p>
        <div style={{ display: "flex", gap: "9px", marginTop: "18px" }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: "11px", border: `1px solid ${t.inputBorder}`, background: "transparent", color: t.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {tr.cancel}
          </button>
          <button
            onClick={() => deleteMut.mutate({ id: brand.id })}
            disabled={deleteMut.isPending}
            style={{ flex: 1, padding: "10px", borderRadius: "11px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: deleteMut.isPending ? 0.7 : 1 }}
          >
            {deleteMut.isPending ? "..." : tr.delete}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Brands Page ────────────────────────────────────────────────

export const BrandsPage: React.FC = () => {
  const t = useAppStore((s) => s.theme);
  const tr = useAppStore((s) => s.tr);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; brand: Brand | null }>({ open: false, brand: null });
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.brand.list.useQuery({});
  const brands = (data ?? []) as Brand[];

  const filtered = brands.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = brands.filter((b) => b.isActive).length;

  const handleSuccess = () => { setModal({ open: false, brand: null }); refetch(); };
  const handleDeleteSuccess = () => { setDeleteTarget(null); refetch(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <div style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: t.textFaint, pointerEvents: "none" }}>
            <Icon name="search" size={13} />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
            style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "11px", padding: "9px 12px 9px 33px", color: t.text, fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setModal({ open: true, brand: null })}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "11px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            <Icon name="plus" size={13} /> New Brand
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr auto 120px 80px", gap: "8px", padding: "10px 18px", borderBottom: `1px solid ${t.borderMid}` }}>
          {["Brand", "Description", tr.status, "Created", ""].map((h, i) => (
            <span key={i} style={{ color: t.textFaint, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "56px", textAlign: "center", color: t.textFaint, fontSize: "13px" }}>
            {search ? "No brands match your search" : "No brands yet — create one to get started"}
          </div>
        ) : (
          filtered.map((brand) => (
            <div
              key={brand.id}
              onClick={() => setDetailId(brand.id)}
              style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr auto 120px 80px", gap: "8px", padding: "13px 18px", alignItems: "center", borderBottom: `1px solid ${t.borderMid}`, transition: "background 0.15s", cursor: "pointer", background: detailId === brand.id ? t.surfaceHover : "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = detailId === brand.id ? t.surfaceHover : "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: brand.logoUrl ? "#fff" : "var(--primary-12)", border: brand.logoUrl ? `1px solid ${t.border}` : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {brand.logoUrl
                    ? <img src={brand.logoUrl} alt={brand.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
                    : <Icon name="brand" size={14} style={{ color: "var(--primary)" }} />
                  }
                </div>
                <span style={{ color: t.text, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand.name}</span>
              </div>

              <span style={{ color: t.textMuted, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {brand.description || <span style={{ color: t.textFaint, fontStyle: "italic" }}>No description</span>}
              </span>

              <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", whiteSpace: "nowrap", background: brand.isActive ? "rgba(16,185,129,0.12)" : t.inputBg, color: brand.isActive ? "#10b981" : t.textFaint }}>
                {brand.isActive ? tr.active : tr.inactive}
              </span>

              <span style={{ color: t.textFaint, fontSize: "11px" }}>
                {new Date(brand.createdAt).toLocaleDateString()}
              </span>

              <div style={{ display: "flex", gap: "3px", justifyContent: "flex-end" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setModal({ open: true, brand }); }}
                  style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: t.inputBg, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Edit"
                >
                  <Icon name="edit" size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(brand); }}
                  style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Delete"
                >
                  <Icon name="trash" size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tip */}
      <p style={{ color: t.textFaint, fontSize: "11.5px", lineHeight: 1.6 }}>
        Brands are assigned to products and can be used to filter inventory in the Stock page.
      </p>

      {detailId && (
        <BrandDrawer
          brandId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(b) => { setDetailId(null); setModal({ open: true, brand: b }); }}
          onDelete={(b) => { setDeleteTarget(b); }}
        />
      )}
      {modal.open && (
        <BrandModal brand={modal.brand} onClose={() => setModal({ open: false, brand: null })} onSuccess={handleSuccess} />
      )}
      {deleteTarget && (
        <DeleteModal brand={deleteTarget} onClose={() => setDeleteTarget(null)} onSuccess={handleDeleteSuccess} />
      )}
    </div>
  );
};
