import React from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Icon } from '../../components/ui/Icon'
import { CURRENCIES } from '../../constants/currencies'
import { LANG_OPTIONS } from '../../constants/translations'

// ── Helpers ───────────────────────────────────────────────────

const APP_VERSION = '1.0.0'

// ── Section card wrapper ──────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode; t: any }> = ({ title, children, t }) => (
	<div style={{
		background: t.surface,
		border: `1px solid ${t.border}`,
		borderRadius: '16px',
		padding: '20px 24px',
		marginBottom: '16px',
	}}>
		<p style={{
			color: t.textFaint, fontSize: '10px', fontWeight: 700,
			textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '16px',
		}}>{title}</p>
		{children}
	</div>
)

// ── Component ─────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
	const t = useAppStore((s) => s.theme)
	const isDark = useAppStore((s) => s.isDark)
	const toggleTheme = useAppStore((s) => s.toggleTheme)
	const lang = useAppStore((s) => s.lang)
	const setLang = useAppStore((s) => s.setLang)
	const currency = useAppStore((s) => s.currency)
	const setCurrency = useAppStore((s) => s.setCurrency)

	const optionBtn = (active: boolean): React.CSSProperties => ({
		padding: '10px 16px',
		borderRadius: '10px',
		border: `1.5px solid ${active ? '#7c3aed' : t.border}`,
		background: active ? 'rgba(124,58,237,0.08)' : t.inputBg,
		color: active ? '#7c3aed' : t.text,
		cursor: 'pointer',
		fontFamily: 'inherit',
		fontSize: '13px',
		fontWeight: active ? 700 : 400,
		transition: 'all 0.15s',
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
	})

	return (
		<div style={{ maxWidth: '680px', animation: 'slideUp 0.2s ease' }}>

			{/* ── Appearance ── */}
			<Section title="Appearance" t={t}>
				<div style={{ display: 'flex', gap: '10px' }}>
					{/* Dark */}
					<button
						onClick={() => !isDark && toggleTheme()}
						style={{
							...optionBtn(isDark),
							flex: 1, justifyContent: 'center', padding: '14px',
							flexDirection: 'column', gap: '8px',
						}}
					>
						<Icon name="moon" size={20} style={{ color: isDark ? '#7c3aed' : t.textFaint }} />
						<span style={{ fontSize: '12px' }}>Dark Mode</span>
					</button>

					{/* Light */}
					<button
						onClick={() => isDark && toggleTheme()}
						style={{
							...optionBtn(!isDark),
							flex: 1, justifyContent: 'center', padding: '14px',
							flexDirection: 'column', gap: '8px',
						}}
					>
						<Icon name="sun" size={20} style={{ color: !isDark ? '#7c3aed' : t.textFaint }} />
						<span style={{ fontSize: '12px' }}>Light Mode</span>
					</button>
				</div>
			</Section>

			{/* ── Language ── */}
			<Section title="Language" t={t}>
				<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
					{LANG_OPTIONS.map((opt) => (
						<button
							key={opt.code}
							onClick={() => setLang(opt.code)}
							style={{ ...optionBtn(lang === opt.code), minWidth: '130px', flex: 1 }}
						>
							<span style={{ fontSize: '18px', lineHeight: 1 }}>{opt.flag}</span>
							<span>{opt.label}</span>
						</button>
					))}
				</div>
			</Section>

			{/* ── Currency ── */}
			<Section title="Currency" t={t}>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
					gap: '8px',
				}}>
					{CURRENCIES.map((c) => {
						const active = currency.code === c.code
						return (
							<button
								key={c.code}
								onClick={() => setCurrency(c)}
								style={{
									padding: '10px 14px',
									borderRadius: '10px',
									border: `1.5px solid ${active ? '#7c3aed' : t.border}`,
									background: active ? 'rgba(124,58,237,0.08)' : t.inputBg,
									cursor: 'pointer',
									fontFamily: 'inherit',
									textAlign: 'left',
									transition: 'all 0.15s',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
									<span style={{ fontSize: '18px', fontWeight: 800, color: active ? '#7c3aed' : t.text, lineHeight: 1 }}>
										{c.symbol}
									</span>
									<span style={{ fontSize: '11px', fontWeight: 700, color: active ? '#7c3aed' : t.textMuted }}>
										{c.code}
									</span>
								</div>
								<p style={{ fontSize: '10px', color: t.textFaint, marginTop: '2px' }}>{c.name}</p>
							</button>
						)
					})}
				</div>
			</Section>

			{/* ── About ── */}
			<Section title="About" t={t}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
					{/* App icon */}
					<div style={{
						width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
						background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
					}}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
							<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
							<line x1="3" y1="6" x2="21" y2="6" />
							<path d="M16 10a4 4 0 01-8 0" />
						</svg>
					</div>

					<div>
						<p style={{ color: t.text, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
							MK<span style={{ color: '#8b5cf6' }}>POS</span>
						</p>
						<p style={{ color: t.textMuted, fontSize: '12px', marginTop: '2px' }}>
							Version {APP_VERSION}
						</p>
						<p style={{ color: t.textFaint, fontSize: '11px', marginTop: '4px' }}>
							Electron · React 19 · tRPC · SQLite
						</p>
					</div>
				</div>
			</Section>

		</div>
	)
}
