import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "./Icon";

interface ComingSoonProps { label: string; }

export const ComingSoon: React.FC<ComingSoonProps> = ({ label }) => {
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	return (
		<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", textAlign: "center" }}>
			<div style={{
				width: "60px", height: "60px", borderRadius: "16px",
				background: t.inputBg, border: `1px solid ${t.border}`,
				display: "flex", alignItems: "center", justifyContent: "center",
				marginBottom: "14px", color: t.textFaint,
			}}>
				<Icon name="product" size={24} />
			</div>
			<h2 style={{ color: t.textSubtle, fontSize: "16px", fontWeight: 700 }}>{label}</h2>
			<p style={{ color: t.textFaint, fontSize: "13px", marginTop: "5px" }}>{tr.coming_soon}</p>
		</div>
	);
};
