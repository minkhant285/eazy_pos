import React, { useState, useRef, useEffect } from 'react'
import { Calendar } from 'react-date-range'
import { format, parseISO } from 'date-fns'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import type { ThemeTokens } from '../../types'

interface Props {
  value: string           // YYYY-MM-DD
  onChange: (date: string) => void
  t: ThemeTokens
  isDark: boolean
  placeholder?: string
}

const toDate = (s: string) => parseISO(s + 'T12:00:00')

export const SingleDatePicker: React.FC<Props> = ({
  value, onChange, t, isDark, placeholder = 'Select date',
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const label = value
    ? format(toDate(value), 'MMM d, yyyy')
    : placeholder

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px', width: '100%',
          background: t.inputBg,
          border: `1px solid ${open ? 'var(--primary)' : t.inputBorder}`,
          borderRadius: '10px',
          padding: '8px 12px',
          color: value ? t.text : t.textFaint,
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.15s',
          textAlign: 'left',
        }}
      >
        <CalIcon color={open ? 'var(--primary)' : t.textFaint} />
        <span style={{ flex: 1 }}>{label}</span>
      </button>

      {/* Popover calendar */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          borderRadius: '14px', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          border: `1px solid ${t.border}`,
        }}>
          <style>{isDark ? DARK_CSS : LIGHT_CSS}</style>
          <Calendar
            date={value ? toDate(value) : new Date()}
            onChange={handleSelect}
          />
        </div>
      )}
    </div>
  )
}

const CalIcon = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

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
  .rdrDay.rdrDayHovered .rdrDayNumber span { color: #fff; }
  .rdrSelected { background: var(--primary) !important; }
  .rdrDay:not(.rdrDayPassive) .rdrSelected ~ .rdrDayNumber span { color: #fff; }
`

const LIGHT_CSS = `
  .rdrCalendarWrapper { background: #ffffff; color: #1a202c; font-family: 'DM Sans', sans-serif; }
  .rdrMonthAndYearWrapper { background: #ffffff; }
  .rdrWeekDay { color: #9ca3af; font-size: 11px; }
  .rdrDayNumber span { color: #1a202c; }
  .rdrDayPassive .rdrDayNumber span { color: #d1d5db; }
  .rdrDayToday .rdrDayNumber span::after { background: var(--primary); }
  .rdrSelected { background: var(--primary) !important; }
  .rdrDay:not(.rdrDayPassive) .rdrSelected ~ .rdrDayNumber span { color: #fff; }
`
