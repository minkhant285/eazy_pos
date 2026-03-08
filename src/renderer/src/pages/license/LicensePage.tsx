import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { trpc } from '../../trpc-client/trpc';

interface Props {
  machineId: string;
  isExpired: boolean; // trial_expired vs key_expired
  onActivated: () => void;
}

export const LicensePage: React.FC<Props> = ({ machineId, isExpired, onActivated }) => {
  const t = useAppStore((s) => s.theme);
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const activate = trpc.license.activate.useMutation({
    onSuccess: (data) => {
      if (data?.success) {
        onActivated();
      } else {
        setError(data?.error ?? 'Activation failed');
      }
    },
    onError: () => setError('Network error — please try again'),
  });

  const handleActivate = () => {
    if (!key.trim()) return;
    setError('');
    activate.mutate({ key: key.trim() });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(machineId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const midDisplay = machineId.length > 0
    ? machineId.match(/.{1,8}/g)?.join('-') ?? machineId
    : '...';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '480px', margin: '0 20px',
        background: t.surface,
        border: `1px solid ${t.borderStrong}`,
        borderRadius: '24px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 32px 24px',
          borderBottom: `1px solid ${t.borderMid}`,
          textAlign: 'center',
        }}>
          {/* Lock icon */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(var(--primary-rgb),0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke={isExpired ? '#ef4444' : 'var(--primary)'} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 style={{ color: t.text, fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>
            {isExpired ? 'License Required' : 'Activation Required'}
          </h1>
          <p style={{ color: t.textMuted, fontSize: '13px', lineHeight: 1.6 }}>
            {isExpired
              ? 'Your 30-day free trial has ended. Enter your activation key to continue using Easy POS.'
              : 'Your activation key has expired. Please enter a new key to continue.'}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Machine ID */}
          <div>
            <label style={{
              display: 'block', marginBottom: '7px',
              color: t.textMuted, fontSize: '10.5px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              Your Machine ID
            </label>
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              background: t.inputBg, border: `1px solid ${t.border}`,
              borderRadius: '12px', padding: '10px 14px',
            }}>
              <span style={{
                flex: 1, fontFamily: 'monospace', fontSize: '11px',
                color: t.textSubtle, letterSpacing: '0.5px',
                wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {midDisplay}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  flexShrink: 0,
                  padding: '5px 10px', borderRadius: '8px',
                  border: `1px solid ${t.inputBorder}`,
                  background: copied ? 'rgba(16,185,129,0.12)' : t.surface,
                  color: copied ? '#10b981' : t.textMuted,
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ color: t.textFaint, fontSize: '11px', marginTop: '6px' }}>
              Send this ID to the developer to get your activation key.
            </p>
          </div>

          {/* Key input */}
          <div>
            <label style={{
              display: 'block', marginBottom: '7px',
              color: t.textMuted, fontSize: '10.5px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              Activation Key
            </label>
            <input
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              placeholder="MKJRNL-..."
              spellCheck={false}
              style={{
                width: '100%',
                background: t.inputBg,
                border: `1px solid ${error ? '#ef4444' : t.inputBorder}`,
                borderRadius: '12px',
                padding: '11px 14px',
                color: t.text,
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
                letterSpacing: '0.3px',
                transition: 'border-color 0.15s',
              }}
            />
            {error && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{error}</p>
            )}
          </div>

          {/* Activate button */}
          <button
            onClick={handleActivate}
            disabled={!key.trim() || activate.isPending}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '13px',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: !key.trim() || activate.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: !key.trim() || activate.isPending ? 0.6 : 1,
              boxShadow: '0 4px 16px var(--primary-35)',
              transition: 'opacity 0.15s',
            }}
          >
            {activate.isPending ? 'Verifying…' : 'Activate License'}
          </button>

          <p style={{ textAlign: 'center', color: t.textFaint, fontSize: '11.5px' }}>
            Contact your software provider to purchase a license key.
          </p>
        </div>
      </div>
    </div>
  );
};
