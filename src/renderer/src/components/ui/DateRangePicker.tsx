import React, { useState, useRef, useEffect } from 'react'
import { DateRange, type RangeKeyDict } from 'react-date-range'
import { format } from 'date-fns'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import type { ThemeTokens } from '../../types'

interface Props {
  fromDate: string       // YYYY-MM-DD or ''
  toDate: string         // YYYY-MM-DD or ''
  onChange: (from: string, to: string) => void
  t: ThemeTokens
  isDark: boolean
  placeholder?: string
}

const toDate = (s: string) => new Date(s + 'T12:00:00')

export const DateRangePicker: React.FC<Props> = ({
  fromDate, toDate: toDateStr, onChange, t, isDark, placeholder = 'Date range',
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasSelection = !!(fromDate || toDateStr)

  const ranges = [{
    startDate: fromDate ? toDate(fromDate) : new Date(),
    endDate:   toDateStr ? toDate(toDateStr) : (fromDate ? toDate(fromDate) : new Date()),
    key: 'selection',
  }]

  const handleChange = (item: RangeKeyDict) => {
    const { startDate: s, endDate: e } = item.selection
    const from = s ? format(s, 'yyyy-MM-dd') : ''
    const to   = e ? format(e, 'yyyy-MM-dd') : ''
    onChange(from, to)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', '')
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const fmt = (s: string) => format(toDate(s), 'MMM d')
  const label = hasSelection
    ? [fromDate && fmt(fromDate), toDateStr && fmt(toDateStr)].filter(Boolean).join(' – ')
    : placeholder

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: t.inputBg,
          border: `1px solid ${open || hasSelection ? 'var(--primary)' : t.inputBorder}`,
          borderRadius: '10px',
          padding: '7px 12px',
          color: hasSelection ? t.text : t.textFaint,
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <CalIcon color={hasSelection ? 'var(--primary)' : t.textFaint} />
        {label}
        {hasSelection && (
          <span
            onClick={handleClear}
            style={{
              marginLeft: '2px', opacity: 0.55, fontSize: '15px', lineHeight: 1,
              cursor: 'pointer', fontWeight: 400,
            }}
          >×</span>
        )}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 9999,
          borderRadius: '14px', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          border: `1px solid ${t.border}`,
        }}>
          <style>{isDark ? DARK_CSS : LIGHT_CSS}</style>
          <DateRange
            ranges={ranges}
            onChange={handleChange}
            months={1}
            direction="horizontal"
            showDateDisplay={false}
            moveRangeOnFirstSelection={false}
            showSelectionPreview
          />
        </div>
      )}
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────

const CalIcon = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

// ── Theme overrides ────────────────────────────────────────────

const DARK_CSS = `
  .rdrCalendarWrapper { background: #1c1829; color: #e2e8f0; font-family: 'DM Sans', sans-serif; }
  .rdrMonthAndYearWrapper { background: #1c1829; }
  .rdrMonthAndYearPickers select { background: #1c1829; color: #e2e8f0; border: none; }
  .rdrMonthAndYearPickers select:hover { background: #2a2440; }
  .rdrNextPrevButton { background: #2a2440; border-radius: 6px; }
  .rdrNextPrevButton:hover { background: #3a3455; }
  .rdrPprevButton i { border-color: transparent #a0aec0 transparent transparent; }
  .rdrNextButton i { border-color: transparent transparent transparent #a0aec0; }
  .rdrWeekDay { color: #6b7280; font-size: 11px; }
  .rdrMonth { background: #1c1829; }
  .rdrDayNumber span { color: #cbd5e1; }
  .rdrDayPassive .rdrDayNumber span { color: #3a3a5c; }
  .rdrDayDisabled .rdrDayNumber span { color: #3a3a5c; }
  .rdrDayToday .rdrDayNumber span::after { background: var(--primary); }
  .rdrStartEdge, .rdrEndEdge { background: var(--primary) !important; color: #fff; }
  .rdrInRange { background: var(--primary-18) !important; }
  .rdrDay:not(.rdrDayPassive) .rdrInRange ~ .rdrDayNumber span,
  .rdrDay:not(.rdrDayPassive) .rdrStartEdge ~ .rdrDayNumber span,
  .rdrDay:not(.rdrDayPassive) .rdrEndEdge ~ .rdrDayNumber span { color: #fff; }
  .rdrDayHovered .rdrDayNumber span { color: #fff; }
`

const LIGHT_CSS = `
  .rdrCalendarWrapper { background: #ffffff; color: #1a202c; font-family: 'DM Sans', sans-serif; }
  .rdrMonthAndYearWrapper { background: #ffffff; }
  .rdrWeekDay { color: #9ca3af; font-size: 11px; }
  .rdrDayNumber span { color: #1a202c; }
  .rdrDayPassive .rdrDayNumber span { color: #d1d5db; }
  .rdrDayToday .rdrDayNumber span::after { background: var(--primary); }
  .rdrStartEdge, .rdrEndEdge { background: var(--primary) !important; }
  .rdrInRange { background: var(--primary-18) !important; }
  .rdrDay:not(.rdrDayPassive) .rdrInRange ~ .rdrDayNumber span,
  .rdrDay:not(.rdrDayPassive) .rdrStartEdge ~ .rdrDayNumber span,
  .rdrDay:not(.rdrDayPassive) .rdrEndEdge ~ .rdrDayNumber span { color: #fff; }
`
