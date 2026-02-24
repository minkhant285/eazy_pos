import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { LANG_OPTIONS } from "../../constants/translations";
import type { LangCode } from "../../types";

export const LangPicker: React.FC = () => {
	const lang = useAppStore((s) => s.lang);
	const setLang = useAppStore((s) => s.setLang);
	const t = useAppStore((s) => s.theme);
	const [open, setOpen] = useState(false);
	const current = LANG_OPTIONS.find((l) => l.code === lang)!;

	return (
		<div style={{ position: "relative" }}>
			<button
				onClick={() => setOpen((v) => !v)}
				style={{
					display: "flex", alignItems: "center", gap: "6px",
					padding: "5px 10px", borderRadius: "10px",
					border: `1px solid ${t.inputBorder}`, background: t.inputBg,
					color: t.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
				}}
			>
				<span style={{ fontSize: "14px" }}>{current.flag}</span>
				<span style={{ fontWeight: 500 }}>{current.label}</span>
				<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
					<path d="M6 9l6 6 6-6" />
				</svg>
			</button>

			{open && (
				<>
					<div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
					<div style={{
						position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
						background: t.surface, border: `1px solid ${t.borderStrong}`,
						borderRadius: "12px", overflow: "hidden", minWidth: "130px",
						boxShadow: "0 8px 40px rgba(0,0,0,0.25)", animation: "slideUp 0.15s ease",
					}}>
						{LANG_OPTIONS.map((l) => (
							<button
								key={l.code}
								onClick={() => { setLang(l.code as LangCode); setOpen(false); }}
								style={{
									width: "100%", display: "flex", alignItems: "center", gap: "8px",
									padding: "9px 12px", fontSize: "12px", cursor: "pointer", border: "none",
									background: lang === l.code ? t.activeNav : "transparent",
									color: lang === l.code ? t.activeNavText : t.text,
									fontWeight: lang === l.code ? 600 : 400,
									textAlign: "left", fontFamily: "inherit",
								}}
							>
								<span style={{ fontSize: "15px" }}>{l.flag}</span>
								{l.label}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
};
