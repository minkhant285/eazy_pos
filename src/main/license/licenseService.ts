import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMachineId } from './machineId';
import { verifyKey } from './licenseVerifier';

const TRIAL_DAYS = 30;

// ── License file location ─────────────────────────────────────

function getLicensePath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.PROGRAMDATA ?? 'C:\\ProgramData', '.mkjournal-license');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', '.mkjournal-license');
  }
  // Linux
  return path.join(os.homedir(), '.config', '.mkjournal-license');
}

// ── License file schema ────────────────────────────────────────

interface LicenseFile {
  t: number;   // trial start (unix seconds)
  s: number;   // last-seen (unix seconds) — for clock-rollback detection
  m: string;   // machine ID at first run
  k?: string;  // activated key (if any)
}

// ── File I/O ──────────────────────────────────────────────────

function readFile(): LicenseFile | null {
  try {
    const raw = fs.readFileSync(getLicensePath(), 'utf8');
    return JSON.parse(raw) as LicenseFile;
  } catch {
    return null;
  }
}

function writeFile(data: LicenseFile): void {
  fs.writeFileSync(getLicensePath(), JSON.stringify(data), 'utf8');
}

// ── Public types ──────────────────────────────────────────────

export type LicenseStatus = {
  status: 'trial' | 'active' | 'trial_expired' | 'key_expired';
  daysLeft?: number;
  expiresAt?: string;
  machineId: string;
};

// ── Core logic ────────────────────────────────────────────────

export function checkLicense(): LicenseStatus {
  const machineId = getMachineId();
  const nowSec = Math.floor(Date.now() / 1000);

  let data = readFile();

  if (!data) {
    // First run — create trial record
    data = { t: nowSec, s: nowSec, m: machineId };
    writeFile(data);
  }

  // Anti-tamper: detect clock rollback (> 60s tolerance)
  if (nowSec < data.s - 60) {
    return { status: 'trial_expired', machineId };
  }

  // Update last-seen timestamp
  data.s = nowSec;
  writeFile(data);

  // If an activated key exists, try it first
  if (data.k) {
    const result = verifyKey(data.k, machineId);
    if (result.valid && result.expiresAt) {
      const daysLeft = Math.ceil((result.expiresAt.getTime() - Date.now()) / 86_400_000);
      return {
        status: 'active',
        daysLeft,
        expiresAt: result.expiresAt.toISOString(),
        machineId,
      };
    }
    // Key expired — fall through to trial check
    if (result.error === 'Key expired') {
      return { status: 'key_expired', machineId };
    }
  }

  // Trial window
  const trialEndSec = data.t + TRIAL_DAYS * 86_400;
  if (nowSec < trialEndSec) {
    const daysLeft = Math.ceil((trialEndSec - nowSec) / 86_400);
    return { status: 'trial', daysLeft, machineId };
  }

  return { status: 'trial_expired', machineId };
}

export function clearLicense(): void {
  try { fs.unlinkSync(getLicensePath()) } catch { /* already gone */ }
}

export function activateLicense(key: string): {
  success: boolean;
  error?: string;
  status?: LicenseStatus;
} {
  const machineId = getMachineId();
  const result = verifyKey(key.trim(), machineId);

  if (!result.valid) {
    return { success: false, error: result.error };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const existing = readFile();
  const updated: LicenseFile = existing
    ? { ...existing, k: key.trim(), s: nowSec }
    : { t: nowSec, s: nowSec, m: machineId, k: key.trim() };

  writeFile(updated);
  return { success: true, status: checkLicense() };
}
