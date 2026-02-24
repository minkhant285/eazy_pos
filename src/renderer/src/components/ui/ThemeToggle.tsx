import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { Icon } from "./Icon";

export const ThemeToggle: React.FC = () => {
	const isDark = useAppStore((s) => s.isDark);
	const toggleTheme = useAppStore((s) => s.toggleTheme);
	const t = useAppStore((s) => s.theme);
	const tr = useAppStore((s) => s.tr);

	return (
		<button
			onClick={toggleTheme}
			title={isDark ? tr.light_mode : tr.dark_mode}
			style={{
				width: "34px", height: "34px",
				display: "flex", alignItems: "center", justifyContent: "center",
				borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
				background: t.inputBg, color: t.textMuted, cursor: "pointer",
			}}
		>
			<Icon name={isDark ? "sun" : "moon"} size={15} />
		</button>
	);
};
