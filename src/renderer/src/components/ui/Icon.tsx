import React from "react";
import { icons, type IconKey } from "../../constants/icons";

interface IconProps {
	name: IconKey;
	size?: number;
	style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, style }) => (
	<svg
		width={size} height={size} viewBox="0 0 24 24"
		fill="none" stroke="currentColor"
		strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
		style={style}
	>
		<path d={icons[name]} />
	</svg>
);
