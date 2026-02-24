import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ThemeToggle } from "../ui/ThemeToggle";
import { LangPicker } from "../ui/LangPicker";
import { Icon } from "../ui/Icon";

export const Topbar: React.FC = () => {
	const page = useAppStore((s) => s.page);
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	const pageLabel = tr[page as keyof typeof tr] as string ?? page;

	return (
		<header style={{
			height: "56px", flexShrink: 0,
			display: "flex", alignItems: "center", justifyContent: "space-between",
			padding: "0 20px",
			borderBottom: `1px solid ${t.borderMid}`,
			background: t.surface, transition: "background 0.25s",
		}}>
			{/* Breadcrumb */}
			<div style={{ display: "flex", alignItems: "center", gap: "6px", color: t.textFaint, fontSize: "12px" }}>
				<span style={{ fontWeight: 700 }}>MKPOS</span>
				<span>/</span>
				<span style={{ color: t.textSubtle, fontWeight: 500 }}>{pageLabel}</span>
			</div>

			{/* Right controls */}
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<ThemeToggle />
				<LangPicker />

				<div style={{ width: "1px", height: "20px", background: t.divider }} />

				{/* Bell */}
				<button style={{
					position: "relative", width: "32px", height: "32px",
					display: "flex", alignItems: "center", justifyContent: "center",
					borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
					background: t.inputBg, color: t.textMuted, cursor: "pointer",
				}}>
					<Icon name="bell" size={15} />
					<span style={{
						position: "absolute", top: "7px", right: "7px",
						width: "5px", height: "5px", borderRadius: "50%",
						background: "#8b5cf6", border: `1.5px solid ${t.surface}`,
					}} />
				</button>

				<div style={{ width: "1px", height: "20px", background: t.divider }} />

				{/* Avatar */}
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<div style={{
						width: "30px", height: "30px", borderRadius: "50%",
						background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
						display: "flex", alignItems: "center", justifyContent: "center",
						color: "#fff", fontSize: "12px", fontWeight: 700,
					}}>M</div>
					<div>
						<p style={{ color: t.text, fontSize: "12px", fontWeight: 700, lineHeight: 1 }}>Min Khant</p>
						<p style={{ color: t.textFaint, fontSize: "10px", marginTop: "2px" }}>{tr.admin}</p>
					</div>
				</div>
			</div>
		</header>
	);
};
