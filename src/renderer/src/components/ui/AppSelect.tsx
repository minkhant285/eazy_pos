import React from 'react'
import ReactSelect, { StylesConfig, GroupBase } from 'react-select'
import { useAppStore } from '../../store/useAppStore'

export interface SelectOption {
	value: string
	label: string
}

interface AppSelectProps {
	options: SelectOption[]
	value: string
	onChange: (value: string) => void
	placeholder?: string
	isDisabled?: boolean
	isClearable?: boolean
	isSearchable?: boolean
	minWidth?: string | number
	width?: string | number
}

export const AppSelect: React.FC<AppSelectProps> = ({
	options,
	value,
	onChange,
	placeholder = 'Select…',
	isDisabled = false,
	isClearable = false,
	isSearchable,
	minWidth,
	width,
}) => {
	const t      = useAppStore((s) => s.theme)
	const isDark = useAppStore((s) => s.isDark)

	const selected = options.find((o) => o.value === value) ?? null

	const styles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
		container: (base) => ({
			...base,
			minWidth: minWidth ?? undefined,
			width: width ?? base.width,
			// required so the absolute-positioned menu is clipped at the right ancestor
			position: 'relative',
		}),
		control: (base, state) => ({
			...base,
			background: t.inputBg,
			border: `1px solid ${state.isFocused ? 'var(--primary)' : t.inputBorder}`,
			borderRadius: '10px',
			boxShadow: 'none',
			minHeight: '34px',
			fontSize: '12px',
			fontFamily: "'DM Sans', sans-serif",
			cursor: 'pointer',
			transition: 'border-color 0.15s',
			'&:hover': { borderColor: 'var(--primary-light)' },
		}),
		valueContainer: (base) => ({
			...base,
			padding: '2px 10px',
		}),
		singleValue: (base) => ({
			...base,
			color: t.text,
			fontSize: '12px',
			fontFamily: "'DM Sans', sans-serif",
		}),
		placeholder: (base) => ({
			...base,
			color: t.textFaint,
			fontSize: '12px',
		}),
		input: (base) => ({
			...base,
			color: t.text,
			fontSize: '12px',
			fontFamily: "'DM Sans', sans-serif",
			margin: 0,
			padding: 0,
		}),
		menu: (base) => ({
			...base,
			background: t.surface,
			border: `1px solid ${t.borderMid}`,
			borderRadius: '12px',
			boxShadow: isDark
				? '0 10px 32px rgba(0,0,0,0.55)'
				: '0 10px 32px rgba(0,0,0,0.15)',
			overflow: 'hidden',
			zIndex: 9999,
			marginTop: '3px',
			marginBottom: '3px',
		}),
		menuList: (base) => ({
			...base,
			padding: '4px',
			maxHeight: '220px',
		}),
		option: (base, state) => ({
			...base,
			background: state.isSelected
				? 'var(--primary)'
				: state.isFocused
					? isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
					: 'transparent',
			color: state.isSelected ? '#fff' : t.text,
			borderRadius: '8px',
			fontSize: '12px',
			fontFamily: "'DM Sans', sans-serif",
			cursor: 'pointer',
			padding: '7px 10px',
			'&:active': {
				background: state.isSelected ? 'var(--primary)' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
			},
		}),
		indicatorSeparator: () => ({ display: 'none' }),
		dropdownIndicator: (base, state) => ({
			...base,
			color: state.isFocused ? 'var(--primary-light)' : t.textFaint,
			padding: '0 8px 0 2px',
			transition: 'color 0.15s, transform 0.2s',
			transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
		}),
		clearIndicator: (base) => ({
			...base,
			color: t.textFaint,
			padding: '0 4px',
			'&:hover': { color: '#ef4444' },
		}),
	}

	return (
		<ReactSelect
			options={options}
			value={selected}
			onChange={(opt) => onChange(opt?.value ?? '')}
			placeholder={placeholder}
			isDisabled={isDisabled}
			isClearable={isClearable}
			isSearchable={isSearchable ?? options.length > 7}
			styles={styles}
			menuPosition="absolute"
			menuShouldScrollIntoView={false}
		/>
	)
}
